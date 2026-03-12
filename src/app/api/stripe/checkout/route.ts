export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getResend, FROM_ADDRESS, ADMIN_EMAIL } from "@/lib/resend";

// ── FIX #3: server-side enum validation ──
const VALID_MATERIALS = ["PLA", "PETG", "TPU"] as const;
const VALID_QUALITIES = ["draft", "standard", "fine"] as const;
const VALID_DEADLINES = ["ASAP", "2–3 days", "1 week", "No rush"] as const;
type Material = (typeof VALID_MATERIALS)[number];
type Quality  = (typeof VALID_QUALITIES)[number];

type Body = {
  customerName:  string;
  customerEmail: string;
  customerPhone?: string;
  customerCity?:  string;
  fileName:  string;
  filePath:  string;
  material:  Material;
  color:     string;
  quality:   Quality;
  quantity:  number;
  deadline?: string;
  notes?:    string;
};

// ── FILE PATH: must match the pattern issued by sign-upload ──
const VALID_PATH_RE = /^orders\/[a-zA-Z0-9._\-/]+\.(stl|step|obj|3mf)$/i;

function priceCents(input: Pick<Body, "material" | "quality" | "quantity">): number {
  const base = 800;
  const materialAdd = input.material === "PLA" ? 0 : input.material === "PETG" ? 300 : 600;
  const qualityMult = input.quality === "draft" ? 1.0 : input.quality === "standard" ? 1.25 : 1.6;
  const unit = Math.round((base + materialAdd) * qualityMult);
  return unit * input.quantity;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;

    // ── env checks ──
    if (!process.env.STRIPE_SECRET_KEY)        throw new Error("Missing STRIPE_SECRET_KEY");
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
    if (!process.env.NEXT_PUBLIC_SITE_URL)      throw new Error("Missing NEXT_PUBLIC_SITE_URL");

    // ── FIX #3: validate every field server-side ──
    if (!body.customerEmail?.includes("@"))
      return NextResponse.json({ error: "Invalid email." }, { status: 400 });
    if (!body.customerName?.trim())
      return NextResponse.json({ error: "Name is required." }, { status: 400 });
    if (!VALID_PATH_RE.test(body.filePath ?? ""))
      return NextResponse.json({ error: "Invalid file path." }, { status: 400 });
    if (!VALID_MATERIALS.includes(body.material))
      return NextResponse.json({ error: "Invalid material." }, { status: 400 });
    if (!VALID_QUALITIES.includes(body.quality))
      return NextResponse.json({ error: "Invalid quality." }, { status: 400 });

    // ── FIX #3: quantity bounds ──
    const qty = Number(body.quantity);
    if (!Number.isInteger(qty) || qty < 1 || qty > 200)
      return NextResponse.json({ error: "Quantity must be between 1 and 200." }, { status: 400 });

    // ── sanitize optional fields ──
    const color    = (body.color ?? "Black").slice(0, 40);
    const phone    = body.customerPhone?.trim().slice(0, 30)  || null;
    const city     = body.customerCity?.trim().slice(0, 100)  || null;
    const notes    = body.notes?.trim().slice(0, 2000)        || null;
    const deadline = VALID_DEADLINES.includes(body.deadline as any)
      ? body.deadline!
      : "ASAP";

    const cents   = priceCents({ material: body.material, quality: body.quality, quantity: qty });
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

    const admin = supabaseAdmin();

    // ── insert order row (all new fields included) ──
    const { data: order, error: insertErr } = await admin
      .from("orders")
      .insert({
        customer_email: body.customerEmail.trim(),
        customer_name:  body.customerName.trim().slice(0, 120),
        customer_phone: phone,
        customer_city:  city,
        file_name:      body.fileName,
        file_path:      body.filePath,
        material:       body.material,
        color,
        quality:        body.quality,
        quantity:       qty,
        deadline,
        notes,
        price_cents:             cents,
        status:                  "pending",
        stripe_payment_status:   "unpaid",
      })
      .select("id")
      .single();

    if (insertErr || !order) {
      console.error("[checkout] DB insert error:", insertErr);
      return NextResponse.json({ error: insertErr?.message || "DB insert failed." }, { status: 500 });
    }

    // ── create Stripe checkout session ──
    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
      customer_email: body.customerEmail,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: cents,
            product_data: {
              name: `3D Print — ${body.material} / ${body.quality}`,
              description: `Qty ${qty} · ${body.fileName} · ${color} · ${deadline}`,
            },
          },
        },
      ],
      success_url: `${siteUrl}/success?order_id=${order.id}`,
      cancel_url:  `${siteUrl}/cancel?order_id=${order.id}`,
      metadata:    { order_id: order.id },
    });

    // ── save session id ──
    await admin
      .from("orders")
      .update({ stripe_session_id: session.id })
      .eq("id", order.id);

    // ── notify admin (fire-and-forget, don't block checkout) ──
    getResend().emails.send({
      from:    FROM_ADDRESS,
      to:      ADMIN_EMAIL,
      subject: `🖨️ New order — ${body.customerName} / ${body.material} x${qty}`,
      html: `
        <p><strong>New Create3DParts order pending payment.</strong></p>
        <table cellpadding="6" style="border-collapse:collapse;font-family:monospace;font-size:13px">
          <tr><td><b>Name</b></td><td>${body.customerName}</td></tr>
          <tr><td><b>Email</b></td><td>${body.customerEmail}</td></tr>
          ${phone ? `<tr><td><b>Phone</b></td><td>${phone}</td></tr>` : ""}
          ${city  ? `<tr><td><b>City</b></td><td>${city}</td></tr>`  : ""}
          <tr><td><b>File</b></td><td>${body.fileName}</td></tr>
          <tr><td><b>Material</b></td><td>${body.material}</td></tr>
          <tr><td><b>Color</b></td><td>${color}</td></tr>
          <tr><td><b>Quality</b></td><td>${body.quality}</td></tr>
          <tr><td><b>Qty</b></td><td>${qty}</td></tr>
          <tr><td><b>Deadline</b></td><td>${deadline}</td></tr>
          <tr><td><b>Price</b></td><td>$${(cents / 100).toFixed(2)} (pending payment)</td></tr>
          ${notes ? `<tr><td><b>Notes</b></td><td>${notes}</td></tr>` : ""}
          <tr><td><b>Order ID</b></td><td>${order.id}</td></tr>
        </table>
        <p style="margin-top:16px"><a href="${siteUrl}/admin/orders">View in admin →</a></p>
      `,
    }).catch((e) => console.error("[checkout] Admin email failed:", e));

    return NextResponse.json({ url: session.url });
  } catch (e: any) {
    console.error("[checkout] Unhandled error:", e);
    return NextResponse.json({ error: e?.message || "Checkout route crashed." }, { status: 500 });
  }
}
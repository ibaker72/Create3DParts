import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/utils/supabase/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getStripe } from "@/lib/stripe";
import { getResend, FROM_ADDRESS } from "@/lib/resend";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://create3dparts.com";

// ── Helpers ───────────────────────────────────────────────────────────────────
function err(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

// ── Route ─────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  // ── 1. Session: caller must be logged in ──────────────────────────────────
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return err("Unauthorized", 401);

  // ── 2. Role: caller must be admin ─────────────────────────────────────────
  // Use service-role client so RLS never blocks the lookup.
  const admin = supabaseAdmin();
  const { data: callerProfile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (callerProfile?.role !== "admin") return err("Forbidden", 403);

  // ── 3. Validate body ──────────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return err("Invalid JSON body", 400);
  }

  const { quote_id, price_usd } = body as Record<string, unknown>;

  if (!quote_id || typeof quote_id !== "string") {
    return err("quote_id is required", 400);
  }

  const priceNum = Number(price_usd);
  if (!Number.isFinite(priceNum) || priceNum <= 0 || priceNum > 50_000) {
    return err("price_usd must be a positive number (max 50 000)", 400);
  }

  const priceCents = Math.round(priceNum * 100);

  // ── 4. Fetch quote request ────────────────────────────────────────────────
  const { data: quote, error: quoteErr } = await admin
    .from("quote_requests")
    .select(
      "id, customer_name, customer_email, material, color, quality, quantity, deadline, status"
    )
    .eq("id", quote_id)
    .single();

  if (quoteErr || !quote) return err("Quote not found", 404);

  if (quote.status === "priced" || quote.status === "paid") {
    return err(`Quote is already ${quote.status}`, 409);
  }

  // ── 5. Resolve client_id from auth.users by email ─────────────────────────
  // quote_requests stores customer_email but not user_id.
  // listUsers is acceptable for a small user base; add a user_id column to
  // quote_requests to avoid this scan as the business scales.
  const {
    data: { users },
  } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const clientUser = users.find((u) => u.email === quote.customer_email);
  const clientId = clientUser?.id ?? null;

  // ── 6. Create Stripe Payment Link ─────────────────────────────────────────
  // Payment Links are persistent, shareable URLs (unlike Checkout Sessions
  // which expire). We create a one-off Price first, then attach it.
  const stripe = getStripe();

  const stripePrice = await stripe.prices.create({
    currency: "usd",
    unit_amount: priceCents,
    product_data: {
      name: `3D Print — ${quote.material} x${quote.quantity}`,
    },
  });

  const paymentLink = await stripe.paymentLinks.create({
    line_items: [{ price: stripePrice.id, quantity: 1 }],
    metadata: {
      quote_id,
      ...(clientId ? { client_id: clientId } : { client_email: quote.customer_email }),
    },
    // Pre-fill the customer's email so they don't have to type it
    customer_creation: "always",
    after_completion: {
      type: "redirect",
      redirect: {
        url: `${SITE_URL}/dashboard/quotes/${quote_id}?paid=1`,
      },
    },
  });

  // ── 7. Persist price, link, and status ────────────────────────────────────
  const { error: updateErr } = await admin
    .from("quote_requests")
    .update({
      price_cents:        priceCents,
      stripe_payment_link: paymentLink.url,
      status:             "priced",
    })
    .eq("id", quote_id);

  if (updateErr) {
    console.error("[send-quote] DB update failed:", updateErr);
    return err("Failed to save quote update", 500);
  }

  // ── 8. Email the client ───────────────────────────────────────────────────
  const { error: emailErr } = await getResend().emails.send({
    from:    FROM_ADDRESS,
    to:      quote.customer_email,
    subject: `Your quote is ready — $${priceNum.toFixed(2)}`,
    html:    buildEmail({ quote, priceCents, priceUsd: priceNum, paymentUrl: paymentLink.url }),
  });

  if (emailErr) {
    // Payment link is already saved — log and surface the error but don't
    // roll back, so the admin can resend manually if needed.
    console.error("[send-quote] Resend failed:", emailErr);
    return NextResponse.json(
      { ok: false, warning: "Quote saved but email failed to send", payment_link: paymentLink.url },
      { status: 207 }
    );
  }

  return NextResponse.json({
    ok:           true,
    payment_link: paymentLink.url,
    price_cents:  priceCents,
  });
}

// ── Email template ────────────────────────────────────────────────────────────
function buildEmail({
  quote,
  priceCents,
  priceUsd,
  paymentUrl,
}: {
  quote: {
    customer_name: string;
    material: string;
    color: string;
    quality: string;
    quantity: number;
    deadline: string | null;
  };
  priceCents: number;
  priceUsd: number;
  paymentUrl: string;
}) {
  const rows = [
    ["Material",  quote.material],
    ["Color",     quote.color],
    ["Quality",   quote.quality],
    ["Quantity",  String(quote.quantity)],
    ["Deadline",  quote.deadline || "No rush"],
  ] as const;

  return `
    <div style="font-family:sans-serif;max-width:520px;color:#111">
      <h2 style="margin-bottom:4px">Your quote is ready</h2>
      <p>Hi ${quote.customer_name},</p>
      <p>We've reviewed your request and your firm quote is below. Click the button to pay securely via Stripe — nothing is charged until you do.</p>

      <!-- Price callout -->
      <div style="background:#0d0d0d;color:#e8e8e8;padding:24px;border-left:4px solid #f4621f;margin:24px 0">
        <div style="font-size:11px;letter-spacing:0.16em;color:#f4621f;text-transform:uppercase;margin-bottom:8px">
          Your quote
        </div>
        <div style="font-size:36px;font-weight:700;color:#fff;line-height:1">
          $${priceUsd.toFixed(2)}
        </div>
        <div style="font-size:12px;color:#888;margin-top:6px">USD · one-time payment</div>
      </div>

      <!-- Order summary -->
      <table cellpadding="8" style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:24px">
        ${rows
          .map(
            ([label, value], i) => `
          <tr style="background:${i % 2 === 0 ? "#f5f5f5" : "#fff"}">
            <td style="color:#555;width:120px">${label}</td>
            <td><b>${value}</b></td>
          </tr>`
          )
          .join("")}
      </table>

      <!-- CTA -->
      <div style="margin:32px 0">
        <a
          href="${paymentUrl}"
          style="
            display:inline-block;
            background:#f4621f;
            color:#000;
            font-family:'Courier New',monospace;
            font-weight:700;
            font-size:14px;
            letter-spacing:0.08em;
            text-transform:uppercase;
            text-decoration:none;
            padding:14px 28px;
          "
        >
          Pay $${priceUsd.toFixed(2)} →
        </a>
      </div>

      <!-- Fine print -->
      <p style="font-size:12px;color:#888;border-top:1px solid #eee;padding-top:16px">
        This link is powered by Stripe and can be used at any time — it does not expire.
        Once payment clears we'll begin printing and follow up with a timeline.<br/><br/>
        Questions? Just reply to this email.
      </p>
    </div>
  `;
}

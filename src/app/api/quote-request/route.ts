import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabase } from "@/utils/supabase/server";
import { getResend, FROM_ADDRESS, ADMIN_EMAIL } from "@/lib/resend";

const VALID_MATERIALS = ["PLA", "PETG", "TPU"] as const;
const VALID_QUALITIES = ["draft", "standard", "fine"] as const;
const VALID_DEADLINES = ["ASAP", "2–3 days", "1 week", "No rush"] as const;

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      customerName,
      customerEmail,
      customerPhone,
      customerCity,
      material,
      color,
      quality,
      quantity,
      deadline,
      notes,
    } = body;

    // Accept camelCase (filePath/fileName) or snake_case (file_path/file_name)
    const filePath: string | undefined = body.filePath ?? body.file_path;
    const fileName: string | undefined = body.fileName ?? body.file_name;

    // ── server validation ──
    if (!customerName?.trim())
      return NextResponse.json({ error: "Name is required." }, { status: 400 });
    if (!customerEmail?.includes("@"))
      return NextResponse.json({ error: "Valid email is required." }, { status: 400 });
    if (!VALID_MATERIALS.includes(material))
      return NextResponse.json({ error: "Invalid material." }, { status: 400 });
    if (!VALID_QUALITIES.includes(quality))
      return NextResponse.json({ error: "Invalid quality." }, { status: 400 });

    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty < 1 || qty > 500)
      return NextResponse.json({ error: "Quantity must be 1–500." }, { status: 400 });

    // notes only required when no file attached
    if (!filePath && !notes?.trim())
      return NextResponse.json({ error: "Please describe what you need." }, { status: 400 });

    const safeDeadline = VALID_DEADLINES.includes(deadline) ? deadline : "ASAP";
    const safeNotes = notes?.trim().slice(0, 2000) || null;
    const safeColor = (color ?? "Black").slice(0, 40);
    const hasFile = !!filePath;

    // Attach user_id if the request comes from a logged-in user
    let userId: string | null = null;
    try {
      const sessionClient = await createServerSupabase();
      const { data: { user } } = await sessionClient.auth.getUser();
      if (user) userId = user.id;
    } catch {
      // Non-fatal: public submissions don't require a session
    }

    // ── insert to Supabase ──
    const { error: dbErr } = await supabaseAdmin.from("quote_requests").insert({
      customer_name: customerName.trim().slice(0, 120),
      customer_email: customerEmail.trim().slice(0, 200),
      customer_phone: customerPhone?.trim().slice(0, 30) || null,
      customer_city: customerCity?.trim().slice(0, 100) || null,
      material,
      color: safeColor,
      quality,
      quantity: qty,
      deadline: safeDeadline,
      notes: safeNotes,
      file_path: filePath || null,
      file_name: fileName || null,
      status: "pending",
      ...(userId ? { user_id: userId } : {}),
    });

    if (dbErr) {
      console.error("[quote-request] DB error:", dbErr);
      return NextResponse.json({ error: "Failed to save request." }, { status: 500 });
    }

    // ── email sending (IMPORTANT: await both sends so the function doesn't terminate early) ──
    const resend = getResend();

    // ── admin notification ──
    const adminSend = await resend.emails.send({
      from: FROM_ADDRESS,
      to: ADMIN_EMAIL,
      replyTo: customerEmail, // makes replying easy
      subject: `📋 New quote request — ${customerName} / ${material} x${qty}`,
      html: `
        <p><strong>New quote request — respond within 2 hours.</strong></p>
        <table cellpadding="6" style="border-collapse:collapse;font-family:monospace;font-size:13px">
          <tr><td><b>Name</b></td><td>${customerName}</td></tr>
          <tr><td><b>Email</b></td><td>${customerEmail}</td></tr>
          ${customerPhone ? `<tr><td><b>Phone</b></td><td>${customerPhone}</td></tr>` : ""}
          ${customerCity ? `<tr><td><b>City</b></td><td>${customerCity}</td></tr>` : ""}
          <tr><td><b>Material</b></td><td>${material}</td></tr>
          <tr><td><b>Color</b></td><td>${safeColor}</td></tr>
          <tr><td><b>Quality</b></td><td>${quality}</td></tr>
          <tr><td><b>Qty</b></td><td>${qty}</td></tr>
          <tr><td><b>Deadline</b></td><td>${safeDeadline}</td></tr>
          ${
            safeNotes
              ? `<tr><td><b>Notes</b></td><td style="max-width:400px;white-space:pre-wrap">${safeNotes}</td></tr>`
              : ""
          }
          ${hasFile ? `<tr><td><b>File</b></td><td>${fileName} &#10003; uploaded</td></tr><tr><td><b>Storage path</b></td><td style="font-family:monospace;font-size:11px">${filePath}</td></tr>` : ""}
        </table>
        <p style="margin-top:16px">
          <a href="mailto:${customerEmail}?subject=Re: Your Create3DParts quote request">Reply to customer →</a>
        </p>
      `,
    });

    if (adminSend.error) {
      console.error("[quote-request] Admin email failed:", adminSend.error);
      return NextResponse.json(
        { error: "Failed to send admin email.", detail: adminSend.error },
        { status: 502 }
      );
    }

    // ── customer acknowledgment ──
    const customerSend = await resend.emails.send({
      from: FROM_ADDRESS,
      to: customerEmail,
      subject: "Got your request — quote coming within 2 hours",
      html: `
        <div style="font-family:sans-serif;max-width:520px;color:#111">
          <h2 style="margin-bottom:4px">Request received!</h2>
          <p>Hi ${customerName},</p>
          <p>We've got your request and will get back to you within <strong>2 hours</strong> during business hours with a firm price and turnaround time.</p>
          <div style="background:#0d0d0d;color:#e8e8e8;padding:20px;border-left:3px solid #f4621f;margin:24px 0">
            <b style="font-size:13px;letter-spacing:0.08em">YOUR REQUEST SUMMARY</b>
            <table cellpadding="6" style="font-size:13px;color:#aaa;margin-top:12px">
              <tr><td>Material:</td><td style="color:#e8e8e8">${material}</td></tr>
              <tr><td>Quality:</td><td style="color:#e8e8e8">${quality}</td></tr>
              <tr><td>Quantity:</td><td style="color:#e8e8e8">${qty}</td></tr>
              <tr><td>Deadline:</td><td style="color:#e8e8e8">${safeDeadline}</td></tr>
              ${hasFile ? `<tr><td>File:</td><td style="color:#6abf69">✓ ${fileName}</td></tr>` : ""}
            </table>
          </div>
          <p style="font-size:13px;color:#888">Nothing has been charged. We'll email you a firm quote before any payment is taken.</p>
          <p style="font-size:13px;color:#888">Questions? Just reply to this email.</p>
        </div>
      `,
    });

    if (customerSend.error) {
      console.error("[quote-request] Customer ack email failed:", customerSend.error);
      return NextResponse.json(
        { error: "Failed to send customer email.", detail: customerSend.error },
        { status: 502 }
      );
    }

    // ✅ return message IDs so you can confirm sends in logs
    return NextResponse.json({
      ok: true,
      adminMessageId: adminSend.data?.id,
      customerMessageId: customerSend.data?.id,
    });
  } catch (e) {
    console.error("[quote-request] Unhandled error:", e);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
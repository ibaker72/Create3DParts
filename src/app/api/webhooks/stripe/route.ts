// Must use Node.js runtime — Edge runtime cannot read the raw request body
// needed for Stripe signature verification.
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getResend, FROM_ADDRESS, ADMIN_EMAIL } from "@/lib/resend";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://create3dparts.com";

// Register this URL as a separate endpoint in your Stripe dashboard.
// Each registered endpoint gets its own signing secret — store it as
// STRIPE_WEBHOOK_SECRET_QUOTES (or reuse STRIPE_WEBHOOK_SECRET if you
// point the same Stripe endpoint here instead).
const WEBHOOK_SECRET =
  process.env.STRIPE_WEBHOOK_SECRET_QUOTES ??
  process.env.STRIPE_WEBHOOK_SECRET ?? "";

// ── Handler ───────────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  // ── 1. Signature verification ─────────────────────────────────────────────
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  // Read the raw body — must happen before any other body parse
  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(rawBody, sig, WEBHOOK_SECRET);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("[webhooks/stripe] Signature verification failed:", message);
    return NextResponse.json({ error: `Webhook error: ${message}` }, { status: 400 });
  }

  // ── 2. Route by event type ────────────────────────────────────────────────
  // Stripe expects a 200 quickly. Non-200 responses cause retries.
  // We catch all errors inside so a transient failure doesn't trigger a storm.
  try {
    if (event.type === "checkout.session.completed") {
      await handleSessionCompleted(event.data.object as Stripe.Checkout.Session);
    }
    // Add additional event.type handlers here as needed
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("[webhooks/stripe] Handler error:", message);
    // Still return 200 — a 5xx would cause Stripe to retry indefinitely
    return NextResponse.json({ received: true, warning: message });
  }

  return NextResponse.json({ received: true });
}

// ── checkout.session.completed ────────────────────────────────────────────────
async function handleSessionCompleted(session: Stripe.Checkout.Session) {
  const admin = supabaseAdmin();

  // ── 3. Find the quote_request ─────────────────────────────────────────────
  //
  // Two lookup strategies, tried in order:
  //
  // A) stripe_session_id match — used when the client paid via a Checkout
  //    Session that was pre-created by /api/stripe/quote-checkout. That route
  //    saves session.id to quote_requests.stripe_session_id before redirecting.
  //
  // B) metadata.quote_id match — used when the client paid via a Payment Link
  //    created by /api/admin/send-quote. No session ID exists on the record
  //    before payment, so we embedded quote_id in the Payment Link metadata.

  let quote: QuoteRequest | null = null;

  // Strategy A: pre-stored session ID
  const { data: bySession, error: sessionErr } = await admin
    .from("quote_requests")
    .select(
      "id, customer_name, customer_email, material, color, quality, quantity, " +
      "deadline, file_name, price_cents, status, stripe_payment_status"
    )
    .eq("stripe_session_id", session.id)
    .maybeSingle();

  if (!sessionErr) quote = (bySession as any) ?? null;

  // Strategy B: metadata.quote_id (Payment Link flow)
  if (!quote) {
    const metaId =
      session.metadata?.quote_id ??
      session.metadata?.quote_request_id ??
      null;

    if (metaId) {
      const { data: byMeta, error: metaErr } = await admin
        .from("quote_requests")
        .select(
          "id, customer_name, customer_email, material, color, quality, quantity, " +
          "deadline, file_name, price_cents, status, stripe_payment_status"
        )
        .eq("id", metaId)
        .maybeSingle();

      if (!metaErr) quote = (byMeta as any) ?? null;
    }
  }

  if (!quote) {
    // Not a quote_request payment — could be handled by another webhook handler
    console.log(
      "[webhooks/stripe] session.completed — no matching quote_request found",
      { sessionId: session.id, metadata: session.metadata }
    );
    return;
  }

  // ── 4. Idempotency guard ──────────────────────────────────────────────────
  // Stripe may deliver the same event more than once. If we already marked
  // this quote paid, return early — do not send duplicate emails.
  if (quote.stripe_payment_status === "paid" || quote.status === "paid") {
    console.log("[webhooks/stripe] Quote already paid, skipping:", quote.id);
    return;
  }

  // ── 5. Mark quote paid ────────────────────────────────────────────────────
  const { error: updateErr } = await admin
    .from("quote_requests")
    .update({
      status:               "paid",
      stripe_payment_status: "paid",
      // Persist the session ID even for the Payment Link flow (audit trail)
      stripe_session_id:    session.id,
    })
    .eq("id", quote.id);

  if (updateErr) {
    // Throw so the outer catch logs it — still returns 200 to Stripe
    throw new Error(`DB update failed for quote ${quote.id}: ${updateErr.message}`);
  }

  // ── 6. Resolve display values ─────────────────────────────────────────────
  // Prefer DB values; fall back to what Stripe recorded on the session.
  const clientName  = quote.customer_name  || session.customer_details?.name  || "there";
  const clientEmail = quote.customer_email || session.customer_email           || null;
  const paidCents   = session.amount_total ?? quote.price_cents ?? 0;

  if (!clientEmail) {
    console.warn("[webhooks/stripe] No client email found for quote:", quote.id);
    return;
  }

  // ── 7. Send emails (fire-and-forget with individual error logging) ─────────
  // Using allSettled means one email failing won't prevent the other from sending,
  // and neither failure will cause Stripe to retry the webhook event.
  const [clientResult, adminResult] = await Promise.allSettled([
    sendClientEmail({ quote, clientName, clientEmail, paidCents }),
    sendAdminEmail({ quote, clientName, clientEmail, paidCents, sessionId: session.id }),
  ]);

  if (clientResult.status === "rejected") {
    console.error("[webhooks/stripe] Client email failed:", clientResult.reason);
  }
  if (adminResult.status === "rejected") {
    console.error("[webhooks/stripe] Admin email failed:", adminResult.reason);
  }
}

// ── Email senders ─────────────────────────────────────────────────────────────
async function sendClientEmail({
  quote,
  clientName,
  clientEmail,
  paidCents,
}: {
  quote: QuoteRequest;
  clientName: string;
  clientEmail: string;
  paidCents: number;
}) {
  const resend = getResend();
  const { error } = await resend.emails.send({
    from:    FROM_ADDRESS,
    to:      clientEmail,
    subject: "Payment confirmed — your print is queued",
    html:    clientConfirmationHtml({ quote, clientName, paidCents }),
  });
  if (error) throw new Error(`Resend client email: ${JSON.stringify(error)}`);
}

async function sendAdminEmail({
  quote,
  clientName,
  clientEmail,
  paidCents,
  sessionId,
}: {
  quote: QuoteRequest;
  clientName: string;
  clientEmail: string;
  paidCents: number;
  sessionId: string;
}) {
  const resend = getResend();
  const { error } = await resend.emails.send({
    from:    FROM_ADDRESS,
    to:      ADMIN_EMAIL,
    subject: `Payment received — ${clientName} / $${(paidCents / 100).toFixed(2)}`,
    html:    adminNotificationHtml({ quote, clientName, clientEmail, paidCents, sessionId }),
  });
  if (error) throw new Error(`Resend admin email: ${JSON.stringify(error)}`);
}

// ── Email templates ───────────────────────────────────────────────────────────
function clientConfirmationHtml({
  quote,
  clientName,
  paidCents,
}: {
  quote: QuoteRequest;
  clientName: string;
  paidCents: number;
}) {
  const rows: [string, string][] = [
    ["Material", quote.material ?? "—"],
    ["Color",    quote.color    ?? "—"],
    ["Quality",  quote.quality  ?? "—"],
    ["Quantity", String(quote.quantity ?? "—")],
    ["Deadline", quote.deadline ?? "No rush"],
    ["Total paid", `$${(paidCents / 100).toFixed(2)}`],
  ];
  if (quote.file_name) rows.splice(0, 0, ["File", quote.file_name]);

  return `
    <div style="font-family:sans-serif;max-width:520px;color:#111">
      <h2 style="margin-bottom:4px">Payment confirmed!</h2>
      <p style="color:#555;margin-top:0">Hi ${clientName} — we've got your payment and your print is now queued.</p>

      <table cellpadding="8" style="width:100%;border-collapse:collapse;font-size:14px;margin:24px 0">
        ${rows.map(([label, value], i) => `
          <tr style="background:${i % 2 === 0 ? "#f5f5f5" : "#fff"}">
            <td style="color:#555;width:130px"><b>${label}</b></td>
            <td>${value}</td>
          </tr>`).join("")}
      </table>

      <div style="background:#0d0d0d;color:#e8e8e8;padding:20px;border-left:3px solid #f4621f;margin:24px 0">
        <b style="font-size:13px;letter-spacing:0.08em">WHAT HAPPENS NEXT</b>
        <ol style="margin:12px 0 0 16px;padding:0;font-size:14px;line-height:1.8;color:#aaa">
          <li>We'll review your file and prepare the print job.</li>
          <li>You'll receive an email update when printing begins.</li>
          <li>We'll contact you to arrange pickup or confirm shipping.</li>
        </ol>
      </div>

      <div style="margin:24px 0">
        <a
          href="${SITE_URL}/dashboard/quotes/${quote.id}"
          style="
            display:inline-block;
            background:#f4621f;
            color:#000;
            font-family:'Courier New',monospace;
            font-weight:700;
            font-size:13px;
            letter-spacing:0.08em;
            text-transform:uppercase;
            text-decoration:none;
            padding:12px 24px;
          "
        >
          View your order →
        </a>
      </div>

      <p style="font-size:12px;color:#888;border-top:1px solid #eee;padding-top:16px">
        Order ref: <span style="font-family:monospace">${quote.id.slice(0, 8).toUpperCase()}</span><br/>
        Questions? Reply to this email.
      </p>
    </div>
  `;
}

function adminNotificationHtml({
  quote,
  clientName,
  clientEmail,
  paidCents,
  sessionId,
}: {
  quote: QuoteRequest;
  clientName: string;
  clientEmail: string;
  paidCents: number;
  sessionId: string;
}) {
  return `
    <div style="font-family:sans-serif;max-width:540px;color:#111">
      <h2 style="margin-bottom:4px">Payment received — ready to print</h2>
      <p style="color:#555;margin-top:0">A client has paid their quote. Start the print job when ready.</p>

      <table cellpadding="8" style="width:100%;border-collapse:collapse;font-size:14px;margin:20px 0">
        <tr style="background:#f5f5f5"><td><b>Customer</b></td><td>${clientName}</td></tr>
        <tr>                           <td><b>Email</b></td>   <td>${clientEmail}</td></tr>
        <tr style="background:#f5f5f5"><td><b>Amount</b></td>  <td><b>$${(paidCents / 100).toFixed(2)}</b></td></tr>
        <tr>                           <td><b>Material</b></td><td>${quote.material ?? "—"} / ${quote.color ?? "—"} / ${quote.quality ?? "—"}</td></tr>
        <tr style="background:#f5f5f5"><td><b>Quantity</b></td><td>${quote.quantity ?? "—"}</td></tr>
        <tr>                           <td><b>Deadline</b></td><td>${quote.deadline ?? "No rush"}</td></tr>
        ${quote.file_name ? `<tr style="background:#f5f5f5"><td><b>File</b></td><td>${quote.file_name}</td></tr>` : ""}
        <tr>                           <td><b>Quote ID</b></td><td style="font-family:monospace">${quote.id}</td></tr>
        <tr style="background:#f5f5f5"><td><b>Session ID</b></td><td style="font-family:monospace;font-size:11px">${sessionId}</td></tr>
      </table>

      <p style="margin-top:16px">
        <a
          href="${SITE_URL}/admin/orders"
          style="
            display:inline-block;
            background:#f4621f;
            color:#000;
            font-family:'Courier New',monospace;
            font-weight:700;
            font-size:13px;
            letter-spacing:0.08em;
            text-transform:uppercase;
            text-decoration:none;
            padding:12px 24px;
          "
        >
          Open admin panel →
        </a>
      </p>
    </div>
  `;
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface QuoteRequest {
  id: string;
  customer_name: string | null;
  customer_email: string | null;
  material: string | null;
  color: string | null;
  quality: string | null;
  quantity: number | null;
  deadline: string | null;
  file_name: string | null;
  price_cents: number | null;
  status: string | null;
  stripe_payment_status: string | null;
}

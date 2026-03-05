// /api/admin/send-invoice
// Admin sets a price, creates a Stripe Payment Link, saves it, and emails the client.
// Accepts { quote_id, price_usd } — identical contract to /api/admin/send-quote
// so the frontend can call either endpoint interchangeably.

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/utils/supabase/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getStripe } from "@/lib/stripe";
import { getResend, FROM_ADDRESS } from "@/lib/resend";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://create3dparts.com";

function err(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(req: NextRequest) {
  // ── 1. Auth + role ────────────────────────────────────────────────────────
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return err("Unauthorized", 401);

  const admin = supabaseAdmin();
  const { data: callerProfile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (callerProfile?.role !== "admin") return err("Forbidden", 403);

  // ── 2. Validate body ──────────────────────────────────────────────────────
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

  // ── 3. Fetch quote ────────────────────────────────────────────────────────
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

  // ── 4. Create Stripe Payment Link ─────────────────────────────────────────
  const stripe = getStripe();

  let stripePrice: Awaited<ReturnType<typeof stripe.prices.create>>;
  let paymentLink: Awaited<ReturnType<typeof stripe.paymentLinks.create>>;

  try {
    stripePrice = await stripe.prices.create({
      currency: "usd",
      unit_amount: priceCents,
      product_data: {
        name: `3D Print — ${quote.material} x${quote.quantity}`,
      },
    });

    paymentLink = await stripe.paymentLinks.create({
      line_items: [{ price: stripePrice.id, quantity: 1 }],
      metadata: { quote_id },
      customer_creation: "always",
      after_completion: {
        type: "redirect",
        redirect: { url: `${SITE_URL}/dashboard` },
      },
    });
  } catch (stripeError) {
    console.error("[send-invoice] Stripe error:", stripeError);
    return err("Failed to create Stripe payment link", 500);
  }

  // ── 5. Save price + payment link ──────────────────────────────────────────
  const { error: updateErr } = await admin
    .from("quote_requests")
    .update({
      price_cents: priceCents,
      stripe_payment_link: paymentLink.url,
      status: "priced",
    })
    .eq("id", quote_id);

  if (updateErr) {
    console.error("[send-invoice] DB update error:", JSON.stringify(updateErr));
    return err("Failed to save quote update", 500);
  }

  // ── 6. Email the client ───────────────────────────────────────────────────
  const { error: emailErr } = await getResend().emails.send({
    from: FROM_ADDRESS,
    to: quote.customer_email,
    subject: `Your quote is ready — $${priceNum.toFixed(2)}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;color:#111">
        <h2>Your quote is ready</h2>
        <p>Hi ${quote.customer_name},</p>
        <p>We've reviewed your request. Your quote is below. Click Pay Now to proceed — nothing is charged until you do.</p>

        <div style="background:#0d0d0d;color:#e8e8e8;padding:24px;border-left:4px solid #f4621f;margin:24px 0">
          <div style="font-size:11px;letter-spacing:0.16em;color:#f4621f;text-transform:uppercase;margin-bottom:8px">Your quote</div>
          <div style="font-size:36px;font-weight:700;color:#fff;line-height:1">$${priceNum.toFixed(2)}</div>
          <div style="font-size:12px;color:#888;margin-top:6px">USD - one-time payment</div>
        </div>

        <table cellpadding="8" style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:24px">
          <tr style="background:#f5f5f5"><td style="color:#555;width:120px">Material</td><td><b>${quote.material}</b></td></tr>
          <tr><td style="color:#555">Quality</td><td><b>${quote.quality ?? "-"}</b></td></tr>
          <tr style="background:#f5f5f5"><td style="color:#555">Quantity</td><td><b>${quote.quantity}</b></td></tr>
          <tr><td style="color:#555">Deadline</td><td><b>${quote.deadline ?? "No rush"}</b></td></tr>
        </table>

        <div style="margin:32px 0">
          <a
            href="${paymentLink.url}"
            style="display:inline-block;background:#f4621f;color:#000;font-family:'Courier New',monospace;font-weight:700;font-size:14px;letter-spacing:0.08em;text-transform:uppercase;text-decoration:none;padding:14px 28px;"
          >
            Pay $${priceNum.toFixed(2)} &rarr;
          </a>
        </div>

        <p style="font-size:12px;color:#888;border-top:1px solid #eee;padding-top:16px">
          This link is powered by Stripe and does not expire. Once payment clears we'll begin printing.
          Questions? Reply to this email.
        </p>
      </div>
    `,
  });

  if (emailErr) {
    console.error("[send-invoice] Resend failed:", emailErr);
    return NextResponse.json(
      { ok: false, warning: "Invoice saved but email failed", payment_link: paymentLink.url },
      { status: 207 }
    );
  }

  return NextResponse.json({ ok: true, payment_link: paymentLink.url, price_cents: priceCents });
}

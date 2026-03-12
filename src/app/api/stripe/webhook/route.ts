export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getResend, FROM_ADDRESS, ADMIN_EMAIL } from "@/lib/resend";

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  const body = await req.text();

  let event;
  try {
    event = getStripe().webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as any;

      // =========================================================
      // NEW: Handle quote payments
      // Expect metadata:
      //   type: "quote_payment"
      //   quote_id: "<uuid>"
      //   user_id: "<uuid>"
      // =========================================================
      if (session?.metadata?.type === "quote_payment") {
        const quoteId = session?.metadata?.quote_id as string | undefined;
        const userId = session?.metadata?.user_id as string | undefined;

        if (!quoteId || !userId) {
          console.warn("[webhook] quote_payment missing quote_id/user_id", session?.metadata);
          return NextResponse.json({ received: true });
        }

        const admin = supabaseAdmin();

        // 1) mark quote paid
        await admin
          .from("quotes")
          .update({
            status: "paid",
            stripe_payment_intent_id: session.payment_intent as string,
            paid_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", quoteId);

        // 2) create/update order for this quote (idempotent)
        // IMPORTANT: requires a UNIQUE constraint on orders.quote_id
        await admin.from("orders").upsert(
          {
            quote_id: quoteId,
            user_id: userId,
            order_status: "queued",
            customer_email: session.customer_email,
            customer_name: session.customer_details?.name ?? null,

            // keep Stripe fields consistent with your current orders flow
            stripe_payment_status: "paid",
            status: "paid",
            stripe_session_id: session.id,
          },
          { onConflict: "quote_id" }
        );

        // 3) add an order event
        const { data: order } = await admin
          .from("orders")
          .select("id")
          .eq("quote_id", quoteId)
          .single();

        if (order?.id) {
          await admin.from("order_events").insert({
            order_id: order.id,
            status: "queued",
            note: "Payment confirmed via Stripe.",
          });
        }

        return NextResponse.json({ received: true });
      }

      // =========================================================
      // EXISTING: Normal order payments (metadata.order_id)
      // =========================================================
      const orderId = session?.metadata?.order_id as string | undefined;

      if (orderId) {
        const admin = supabaseAdmin();

        // ── 1) mark order paid ──
        const { data: order } = await admin
          .from("orders")
          .update({
            stripe_payment_status: "paid",
            status: "paid",
            stripe_session_id: session.id,
          })
          .eq("id", orderId)
          .select(
            "customer_name, customer_email, material, color, quality, quantity, price_cents, deadline, notes, file_name"
          )
          .single();

        // ── 2) email customer confirmation ──
        if (order?.customer_email) {
          getResend()
            .emails.send({
              from: FROM_ADDRESS,
              to: order.customer_email,
              subject: "Your Create3DParts order is confirmed",
              html: `
                <div style="font-family:sans-serif;max-width:520px;color:#111">
                  <h2 style="margin-bottom:4px">Order confirmed!</h2>
                  <p style="color:#555;margin-top:0">Thanks ${order.customer_name} — payment received. Here's what's next.</p>

                  <table cellpadding="8" style="width:100%;border-collapse:collapse;margin:24px 0;font-size:14px">
                    <tr style="background:#f5f5f5"><td><b>File</b></td><td>${order.file_name}</td></tr>
                    <tr><td><b>Material</b></td><td>${order.material}</td></tr>
                    <tr style="background:#f5f5f5"><td><b>Color</b></td><td>${order.color}</td></tr>
                    <tr><td><b>Quality</b></td><td>${order.quality}</td></tr>
                    <tr style="background:#f5f5f5"><td><b>Qty</b></td><td>${order.quantity}</td></tr>
                    <tr><td><b>Deadline</b></td><td>${order.deadline ?? "ASAP"}</td></tr>
                    <tr style="background:#f5f5f5"><td><b>Total paid</b></td><td>$${(order.price_cents / 100).toFixed(2)}</td></tr>
                    ${order.notes ? `<tr><td><b>Notes</b></td><td>${order.notes}</td></tr>` : ""}
                  </table>

                  <div style="background:#0d0d0d;color:#e8e8e8;padding:20px;border-left:3px solid #f4621f">
                    <b style="font-size:13px;letter-spacing:0.08em">WHAT HAPPENS NEXT</b>
                    <ol style="margin:12px 0 0 16px;padding:0;font-size:14px;line-height:1.8;color:#aaa">
                      <li>We'll review your file and prep the print.</li>
                      <li>You'll get a message when it's printing.</li>
                      <li>We'll contact you to arrange pickup or confirm shipping.</li>
                    </ol>
                  </div>

                  <p style="margin-top:24px;font-size:13px;color:#888">
                    Questions? Reply to this email or text us directly.<br/>
                    Order ID: <span style="font-family:monospace">${orderId}</span>
                  </p>
                </div>
              `,
            })
            .catch((e) => console.error("[webhook] Customer email failed:", e));
        }

        // ── 3) notify admin that payment cleared ──
        getResend()
          .emails.send({
            from: FROM_ADDRESS,
            to: ADMIN_EMAIL,
            subject: `💰 Payment confirmed — ${order?.customer_name ?? "unknown"} / Order ${orderId}`,
            html: `
              <p><strong>Payment confirmed on Stripe.</strong> Order is ready to print.</p>
              <p>Customer: ${order?.customer_email ?? session.customer_email}</p>
              <p>Order ID: <code>${orderId}</code></p>
              <p>Amount: $${((session.amount_total ?? 0) / 100).toFixed(2)}</p>
              <p><a href="${process.env.NEXT_PUBLIC_SITE_URL}/admin/orders">Open admin →</a></p>
            `,
          })
          .catch((e) => console.error("[webhook] Admin payment email failed:", e));
      }
    }

    return NextResponse.json({ received: true });
  } catch (e: any) {
    console.error("[webhook] Handler error:", e);
    return NextResponse.json(
      { error: e?.message || "Webhook handler failed" },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function POST(req: NextRequest) {
  try {
    // Auth check
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (c) => c.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
        },
      }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { requestId } = await req.json();
    if (!requestId) return NextResponse.json({ error: "Missing requestId" }, { status: 400 });

    // Fetch the quote request — must belong to this user's email
    const { data: request, error: dbErr } = await supabaseAdmin
      .from("quote_requests")
      .select("id, customer_email, customer_name, material, quantity, price_cents, status, stripe_payment_status")
      .eq("id", requestId)
      .eq("customer_email", user.email!)
      .single();

    if (dbErr || !request) return NextResponse.json({ error: "Request not found" }, { status: 404 });
    if (request.status !== "quoted") return NextResponse.json({ error: "Quote not ready for payment" }, { status: 400 });
    if (!request.price_cents) return NextResponse.json({ error: "No price set on this quote" }, { status: 400 });
    if (request.stripe_payment_status === "paid") return NextResponse.json({ error: "Already paid" }, { status: 400 });

    const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "https://create3dparts.com";

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: request.customer_email,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `3D Print — ${request.material} x${request.quantity}`,
              description: `Quote request ${request.id.slice(0, 8).toUpperCase()}`,
            },
            unit_amount: request.price_cents,
          },
          quantity: 1,
        },
      ],
      metadata: {
        quote_request_id: request.id,
      },
      success_url: `${origin}/dashboard/quotes/${request.id}?paid=1`,
      cancel_url:  `${origin}/dashboard/quotes/${request.id}?cancelled=1`,
    });

    // Save session ID on the request so webhook can match it
    await supabaseAdmin
      .from("quote_requests")
      .update({ stripe_session_id: session.id })
      .eq("id", request.id);

    return NextResponse.json({ url: session.url });
  } catch (e) {
    console.error("[quote-checkout]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
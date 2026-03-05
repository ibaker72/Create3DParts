import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/utils/supabase/server";
import { getStripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Fetch quote + items via anon client (RLS enforces ownership)
  const { data: quote } = await supabase
    .from("quotes")
    .select("*, quote_items(*)")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!quote) return NextResponse.json({ error: "Quote not found" }, { status: 404 });
  if (!["sent", "approved"].includes(quote.status))
    return NextResponse.json({ error: "Quote is not payable" }, { status: 400 });

  const items = quote.quote_items ?? [];
  const totalCents = items.reduce((s: number, i: any) => s + i.unit_cents * i.qty, 0);
  if (totalCents <= 0) return NextResponse.json({ error: "Invalid quote total" }, { status: 400 });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://create3dparts.com";
  const stripe = getStripe();

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: items.map((item: any) => ({
      price_data: {
        currency: quote.currency ?? "usd",
        unit_amount: item.unit_cents,
        product_data: { name: item.description },
      },
      quantity: item.qty,
    })),
    metadata: {
      type: "quote_payment",
      quote_id: id,
      user_id: user.id,
    },
    customer_email: user.email,
    success_url: `${siteUrl}/dashboard/quotes/${id}?paid=1`,
    cancel_url: `${siteUrl}/dashboard/quotes/${id}`,
  });

  // Store session id on quote (use admin to bypass RLS for this write)
  await supabaseAdmin()
    .from("quotes")
    .update({ stripe_checkout_session_id: session.id, updated_at: new Date().toISOString() })
    .eq("id", id);

  return NextResponse.json({ url: session.url });
}
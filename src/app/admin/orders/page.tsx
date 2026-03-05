import { createClient } from "@supabase/supabase-js";
import AdminPanel from "./AdminPanel";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export default async function AdminOrdersPage() {
  const [{ data: orders, error: ordersErr }, { data: quotes, error: quotesErr }] =
    await Promise.all([
      supabase
        .from("orders")
        .select("id, created_at, customer_name, customer_email, customer_phone, customer_city, material, color, quality, quantity, price_cents, status, stripe_payment_status, file_path, file_name, deadline, notes")
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("quote_requests")
        .select("id, created_at, customer_name, customer_email, customer_phone, customer_city, material, color, quality, quantity, deadline, notes, status")
        .order("created_at", { ascending: false })
        .limit(100),
    ]);

  if (ordersErr) return <pre style={{ color: "red", padding: "2rem" }}>{ordersErr.message}</pre>;
  if (quotesErr) return <pre style={{ color: "red", padding: "2rem" }}>{quotesErr.message}</pre>;

  return <AdminPanel orders={orders ?? []} quotes={quotes ?? []} />;
}

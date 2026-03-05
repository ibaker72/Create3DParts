import { createServerSupabase } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import StatusBadge from "@/components/dashboard/StatusBadge";

export default async function OrdersPage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: orders } = await supabase
    .from("orders")
    .select("id, created_at, order_status, material, color, quality, quantity, customer_name")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div>
      <p style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.65rem", letterSpacing: "0.2em", color: "#f4621f", textTransform: "uppercase", marginBottom: "0.5rem" }}>// Orders</p>
      <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: "1.8rem", letterSpacing: "-0.03em", marginBottom: "2rem" }}>Order History</h1>
      {!orders?.length ? (
        <p style={{ color: "#5a5a5a", fontSize: "0.88rem" }}>No orders yet. <Link href="/#quote" style={{ color: "#f4621f" }}>Place your first order →</Link></p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", background: "#0d0d0d", border: "1px solid #1e1e1e" }}>
            <thead>
              <tr>
                {["Order", "Date", "Material", "Color", "Quality", "Qty", "Status", ""].map(h => (
                  <th key={h} style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.6rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "#5a5a5a", padding: "0.75rem 1rem", textAlign: "left", borderBottom: "1px solid #1e1e1e" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td style={{ padding: "0.8rem 1rem", fontFamily: "'Space Mono', monospace", fontSize: "0.72rem", color: "#f4621f", borderBottom: "1px solid #131313" }}>{o.id.slice(0,8)}…</td>
                  <td style={{ padding: "0.8rem 1rem", fontSize: "0.85rem", color: "#5a5a5a", borderBottom: "1px solid #131313" }}>{new Date(o.created_at).toLocaleDateString()}</td>
                  <td style={{ padding: "0.8rem 1rem", fontSize: "0.85rem", borderBottom: "1px solid #131313" }}>{o.material ?? "—"}</td>
                  <td style={{ padding: "0.8rem 1rem", fontSize: "0.85rem", color: "#a0a0a0", borderBottom: "1px solid #131313" }}>{o.color ?? "—"}</td>
                  <td style={{ padding: "0.8rem 1rem", fontSize: "0.85rem", color: "#a0a0a0", borderBottom: "1px solid #131313" }}>{o.quality ?? "—"}</td>
                  <td style={{ padding: "0.8rem 1rem", fontSize: "0.85rem", borderBottom: "1px solid #131313" }}>{o.quantity ?? "—"}</td>
                  <td style={{ padding: "0.8rem 1rem", borderBottom: "1px solid #131313" }}><StatusBadge status={o.order_status ?? "pending"} /></td>
                  <td style={{ padding: "0.8rem 1rem", borderBottom: "1px solid #131313" }}>
                    <Link href={`/dashboard/orders/${o.id}`} style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.65rem", color: "#5a5a5a", textDecoration: "none" }}>View →</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
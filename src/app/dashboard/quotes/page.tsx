import { createServerSupabase } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import StatusBadge from "@/components/dashboard/StatusBadge";

export default async function QuotesPage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: requests } = await supabase
    .from("quote_requests")
    .select("id, created_at, status, material, color, quality, quantity, deadline, file_name, price_cents, stripe_payment_status")
    .eq("customer_email", user.email!)
    .order("created_at", { ascending: false });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      <div>
        <p style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.65rem", letterSpacing: "0.2em", color: "#f4621f", textTransform: "uppercase", marginBottom: "0.5rem" }}>// My Account</p>
        <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: "1.8rem", letterSpacing: "-0.03em" }}>Quote Requests</h1>
        <p style={{ fontSize: "0.85rem", color: "#5a5a5a", marginTop: "0.4rem" }}>
          All requests submitted under <strong style={{ color: "#a0a0a0" }}>{user.email}</strong>
        </p>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <Link href="/#quote" style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: "0.7rem",
          letterSpacing: "0.08em",
          color: "#000",
          background: "#f4621f",
          textDecoration: "none",
          padding: "0.55rem 1.2rem",
          textTransform: "uppercase",
        }}>
          + New Request
        </Link>
      </div>

      {!requests?.length ? (
        <div style={{ background: "#0d0d0d", border: "1px solid #1e1e1e", padding: "3rem 2rem", textAlign: "center" }}>
          <p style={{ fontSize: "0.88rem", color: "#5a5a5a", marginBottom: "1.5rem" }}>
            No quote requests yet.
          </p>
          <Link href="/#quote" style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: "0.7rem",
            color: "#f4621f",
            border: "1px solid rgba(244,98,31,0.4)",
            padding: "0.5rem 1.2rem",
            textDecoration: "none",
          }}>
            Submit your first request →
          </Link>
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", background: "#0d0d0d", border: "1px solid #1e1e1e" }}>
            <thead>
              <tr>
                {["ID", "Date", "Material", "Qty", "Deadline", "Price", "Status", ""].map(h => (
                  <th key={h} style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.6rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "#5a5a5a", padding: "0.75rem 1rem", textAlign: "left", borderBottom: "1px solid #1e1e1e" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => {
                const isPaid = r.stripe_payment_status === "paid";
                const canPay = r.status === "quoted" && r.price_cents && !isPaid;
                return (
                  <tr key={r.id} style={{ borderBottom: "1px solid #131313" }}>
                    <td style={{ padding: "0.8rem 1rem" }}>
                      <Link href={`/dashboard/quotes/${r.id}`} style={{ color: "#f4621f", fontFamily: "'Space Mono', monospace", fontSize: "0.72rem", textDecoration: "none" }}>
                        {r.id.slice(0, 8).toUpperCase()}
                      </Link>
                    </td>
                    <td style={{ padding: "0.8rem 1rem", fontSize: "0.82rem", color: "#5a5a5a" }}>
                      {new Date(r.created_at).toLocaleDateString()}
                    </td>
                    <td style={{ padding: "0.8rem 1rem", fontSize: "0.85rem", color: "#efefef" }}>
                      {r.material ?? "—"}
                    </td>
                    <td style={{ padding: "0.8rem 1rem", fontSize: "0.85rem", color: "#efefef" }}>
                      {r.quantity ?? "—"}
                    </td>
                    <td style={{ padding: "0.8rem 1rem", fontSize: "0.82rem", color: "#5a5a5a" }}>
                      {r.deadline || "No rush"}
                    </td>
                    <td style={{ padding: "0.8rem 1rem", fontSize: "0.85rem" }}>
                      {r.price_cents
                        ? <span style={{ color: isPaid ? "#6abf69" : "#f4621f", fontWeight: 600 }}>
                            ${(r.price_cents / 100).toFixed(2)}
                          </span>
                        : <span style={{ color: "#5a5a5a" }}>TBD</span>}
                    </td>
                    <td style={{ padding: "0.8rem 1rem" }}>
                      <StatusBadge status={r.status ?? "pending"} />
                    </td>
                    <td style={{ padding: "0.8rem 1rem" }}>
                      {canPay ? (
                        <Link href={`/dashboard/quotes/${r.id}`} style={{
                          fontFamily: "'Space Mono', monospace",
                          fontSize: "0.62rem",
                          letterSpacing: "0.08em",
                          color: "#000",
                          background: "#f4621f",
                          textDecoration: "none",
                          padding: "0.3rem 0.7rem",
                          textTransform: "uppercase",
                        }}>
                          Pay Now
                        </Link>
                      ) : (
                        <Link href={`/dashboard/quotes/${r.id}`} style={{
                          fontFamily: "'Space Mono', monospace",
                          fontSize: "0.62rem",
                          color: "#5a5a5a",
                          textDecoration: "none",
                        }}>
                          View →
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

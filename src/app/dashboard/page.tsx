import { createServerSupabase } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import StatusBadge from "@/components/dashboard/StatusBadge";

export default async function DashboardPage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const email = user.email!;

  const { data: requests } = await supabase
    .from("quote_requests")
    .select("id, created_at, status, material, color, quality, quantity, deadline, notes, file_name, price_cents, stripe_payment_status, stripe_payment_link")
    .or(`user_id.eq.${user.id},customer_email.eq.${email}`)
    .order("created_at", { ascending: false });

  const pending  = requests?.filter(r => r.status === "pending")  ?? [];
  const quoted   = requests?.filter(r => r.status === "quoted")   ?? [];
  const paid     = requests?.filter(r => r.stripe_payment_status === "paid") ?? [];
  const recent   = requests?.slice(0, 6) ?? [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2.5rem" }}>

      {/* Header */}
      <div>
        <p style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.65rem", letterSpacing: "0.2em", color: "#f4621f", textTransform: "uppercase", marginBottom: "0.5rem" }}>// Overview</p>
        <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: "1.8rem", letterSpacing: "-0.03em" }}>Dashboard</h1>
        <p style={{ fontSize: "0.85rem", color: "#5a5a5a", marginTop: "0.4rem" }}>{email}</p>
      </div>

      {/* Action banner — quotes ready to pay */}
      {quoted.length > 0 && (
        <div style={{ background: "rgba(244,98,31,0.07)", border: "1px solid rgba(244,98,31,0.25)", padding: "1rem 1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
          <span style={{ fontSize: "0.88rem", color: "#f4621f" }}>
            ⚡ {quoted.length} quote{quoted.length > 1 ? "s are" : " is"} ready — review and pay to start printing.
          </span>
          <Link href="/dashboard/quotes" style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.72rem", color: "#f4621f", textDecoration: "none", border: "1px solid rgba(244,98,31,0.4)", padding: "0.35rem 0.8rem" }}>
            View Quotes →
          </Link>
        </div>
      )}

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 1, background: "#1e1e1e", border: "1px solid #1e1e1e" }}>
        {[
          { label: "Total Requests", value: requests?.length ?? 0 },
          { label: "Pending Review", value: pending.length },
          { label: "Awaiting Payment", value: quoted.length },
          { label: "Completed", value: paid.length },
        ].map(s => (
          <div key={s.label} style={{ background: "#0d0d0d", padding: "1.2rem 1.5rem" }}>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.6rem", letterSpacing: "0.14em", color: "#5a5a5a", textTransform: "uppercase", marginBottom: "0.5rem" }}>{s.label}</div>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: "1.6rem", color: "#efefef" }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Recent activity */}
      <Section title="Recent Requests" link="/dashboard/quotes">
        {!recent.length ? (
          <Empty>
            No requests yet.{" "}
            <Link href="/#quote" style={{ color: "#f4621f" }}>Submit your first quote request →</Link>
          </Empty>
        ) : (
          <Table headers={["ID", "Date", "Material", "Qty", "Status", "Price"]}>
            {recent.map((r) => (
              <tr key={r.id}>
                <Td>
                  <Link href={`/dashboard/quotes/${r.id}`} style={{ color: "#f4621f", fontFamily: "'Space Mono', monospace", fontSize: "0.72rem" }}>
                    {r.id.slice(0, 8)}…
                  </Link>
                </Td>
                <Td muted>{new Date(r.created_at).toLocaleDateString()}</Td>
                <Td>{r.material ?? "—"}</Td>
                <Td>{r.quantity ?? "—"}</Td>
                <Td><StatusBadge status={r.status ?? "pending"} /></Td>
                <Td>
                  {r.price_cents
                    ? <span style={{ color: r.stripe_payment_status === "paid" ? "#6abf69" : "#f4621f" }}>
                        ${(r.price_cents / 100).toFixed(2)}
                        {r.stripe_payment_status !== "paid" && r.stripe_payment_link && (
                          <a href={r.stripe_payment_link} target="_blank" rel="noreferrer" style={{ marginLeft: "0.5rem", fontSize: "0.65rem", color: "#f4621f", border: "1px solid rgba(244,98,31,0.4)", padding: "0.15rem 0.4rem", textDecoration: "none" }}>
                            Pay Now →
                          </a>
                        )}
                      </span>
                    : <span style={{ color: "#5a5a5a" }}>Pending</span>}
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Section>

    </div>
  );
}

function Section({ title, link, children }: { title: string; link: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: "1rem" }}>{title}</h2>
        <Link href={link} style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.65rem", color: "#5a5a5a", textDecoration: "none", letterSpacing: "0.08em" }}>View all →</Link>
      </div>
      {children}
    </div>
  );
}

function Table({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", background: "#0d0d0d", border: "1px solid #1e1e1e" }}>
        <thead>
          <tr>
            {headers.map(h => (
              <th key={h} style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.6rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "#5a5a5a", padding: "0.75rem 1rem", textAlign: "left", borderBottom: "1px solid #1e1e1e" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function Td({ children, muted }: { children: React.ReactNode; muted?: boolean }) {
  return (
    <td style={{ padding: "0.8rem 1rem", fontSize: "0.85rem", color: muted ? "#5a5a5a" : "#efefef", borderBottom: "1px solid #131313" }}>
      {children}
    </td>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: "0.85rem", color: "#5a5a5a", padding: "1.5rem 0", fontStyle: "italic" }}>{children}</p>;
}

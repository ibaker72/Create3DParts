import { createServerSupabase } from "@/utils/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import StatusBadge from "@/components/dashboard/StatusBadge";
import PayButton from "@/components/dashboard/PayButton";

export default async function QuoteDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: req } = await supabase
    .from("quote_requests")
    .select("*")
    .eq("id", params.id)
    .eq("customer_email", user.email!)
    .single();

  if (!req) notFound();

  const isPaid    = req.stripe_payment_status === "paid";
  const isQuoted  = req.status === "quoted" && req.price_cents && !isPaid;

  return (
    <div style={{ maxWidth: 580 }}>
      <div style={{ marginBottom: "1.5rem" }}>
        <Link href="/dashboard/quotes" style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.56rem", letterSpacing: "0.1em", color: "#5a5a5a", textDecoration: "none", textTransform: "uppercase" }}>
          ← Back to quotes
        </Link>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.8rem", marginBottom: "1.5rem" }}>
        <div>
          <p style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.56rem", letterSpacing: "0.16em", color: "#f4621f", textTransform: "uppercase", marginBottom: "0.35rem" }}>// Quote Request</p>
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: "1.25rem", letterSpacing: "-0.02em" }}>
            {req.id.slice(0, 8).toUpperCase()}
          </h1>
          <p style={{ fontSize: "0.72rem", color: "#5a5a5a", marginTop: "0.15rem" }}>
            Submitted {new Date(req.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </p>
        </div>
        <StatusBadge status={req.status ?? "pending"} />
      </div>

      {/* Pay banner */}
      {isQuoted && (
        <div style={{ background: "rgba(244,98,31,0.07)", border: "1px solid rgba(244,98,31,0.35)", padding: "1rem 1.2rem", marginBottom: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.8rem" }}>
          <div>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.55rem", letterSpacing: "0.14em", color: "#f4621f", textTransform: "uppercase", marginBottom: "0.25rem" }}>Quote Ready</div>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: "1.3rem", color: "#efefef" }}>
              ${(req.price_cents / 100).toFixed(2)}
            </div>
            <div style={{ fontSize: "0.7rem", color: "#5a5a5a", marginTop: "0.15rem" }}>No charge until you click Pay</div>
          </div>
          <PayButton requestId={req.id} priceCents={req.price_cents} />
        </div>
      )}

      {/* Paid confirmation */}
      {isPaid && (
        <div style={{ background: "rgba(106,191,105,0.07)", border: "1px solid rgba(106,191,105,0.25)", padding: "0.8rem 1.2rem", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <span style={{ color: "#6abf69", fontSize: "0.95rem" }}>✓</span>
          <div>
            <div style={{ fontSize: "0.8rem", color: "#6abf69", fontWeight: 600 }}>Payment received</div>
            <div style={{ fontSize: "0.7rem", color: "#5a5a5a" }}>We'll notify you when your part is ready.</div>
          </div>
        </div>
      )}

      {/* Request details */}
      <div style={{ background: "#0d0d0d", border: "1px solid #1e1e1e", marginBottom: "1px" }}>
        <div style={{ padding: "0.75rem 1.2rem", borderBottom: "1px solid #1e1e1e" }}>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.55rem", letterSpacing: "0.14em", color: "#5a5a5a", textTransform: "uppercase" }}>Request Details</span>
        </div>
        {[
          ["Material", req.material],
          ["Color", req.color],
          ["Quality", req.quality],
          ["Quantity", req.quantity],
          ["Deadline", req.deadline || "No rush"],
          ["File", req.file_name || "—"],
          ["Notes", req.notes || "—"],
        ].map(([k, v]) => (
          <div key={k as string} style={{ display: "flex", padding: "0.55rem 1.2rem", borderBottom: "1px solid #131313", gap: "0.8rem" }}>
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.58rem", letterSpacing: "0.08em", color: "#5a5a5a", width: 100, flexShrink: 0, paddingTop: "0.08rem" }}>{k}</span>
            <span style={{ fontSize: "0.78rem", color: "#efefef", wordBreak: "break-all" }}>{v}</span>
          </div>
        ))}
      </div>

      {/* Pending state message */}
      {req.status === "pending" && (
        <div style={{ marginTop: "1.2rem", padding: "0.8rem 1.2rem", border: "1px solid #1e1e1e", background: "#0d0d0d" }}>
          <p style={{ fontSize: "0.78rem", color: "#5a5a5a", lineHeight: 1.65 }}>
            Your request is being reviewed. We'll email <strong style={{ color: "#efefef" }}>{user.email}</strong> with a firm price within 2 hours during business hours.
          </p>
        </div>
      )}
    </div>
  );
}

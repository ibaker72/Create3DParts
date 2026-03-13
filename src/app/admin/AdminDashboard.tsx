"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

// ── Types ─────────────────────────────────────────────────────────────────────
type PendingUser = {
  id: string;
  full_name: string | null;
  email: string;
  created_at: string;
};

export type QuoteRequest = {
  id: string;
  created_at: string;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  material: string | null;
  color: string | null;
  quality: string | null;
  quantity: number | null;
  deadline: string | null;
  notes: string | null;
  file_name: string | null;
  status: string;
  price_cents: number | null;
  stripe_payment_status: string | null;
  stripe_payment_link: string | null;
};

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; border: string }
> = {
  pending:  { label: "Pending",  color: "#a0a0a0", bg: "#111",    border: "#2a2a2a" },
  priced:   { label: "Priced",   color: "#f0b429", bg: "#141008", border: "#3a2e08" },
  paid:     { label: "Paid",     color: "#6abf69", bg: "#0a120a", border: "#1a3a1a" },
  printing: { label: "Printing", color: "#4db6f0", bg: "#081218", border: "#0e2a3a" },
  shipped:  { label: "Shipped",  color: "#4db6f0", bg: "#081218", border: "#0e2a3a" },
  complete: { label: "Complete", color: "#6abf69", bg: "#0a120a", border: "#1a3a1a" },
};

const QUOTE_STATUS_ORDER = ["pending", "priced", "paid", "printing", "shipped", "complete"];

// Next status action labels shown on buttons for paid → complete flow
const ADVANCE_ACTION: Record<string, { label: string; next: string }> = {
  paid:     { label: "▶ Start Printing", next: "printing" },
  printing: { label: "📦 Mark Shipped",  next: "shipped"  },
  shipped:  { label: "✓ Mark Complete",  next: "complete" },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  });
}

function Badge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, color: "#5a5a5a", bg: "#111", border: "#2a2a2a" };
  return (
    <span style={{
      fontFamily: "var(--mono)",
      fontSize: "0.52rem",
      letterSpacing: "0.12em",
      textTransform: "uppercase",
      color: cfg.color,
      border: `1px solid ${cfg.color}50`,
      padding: "0.15rem 0.45rem",
      whiteSpace: "nowrap",
    }}>
      {cfg.label}
    </span>
  );
}

// ── Root component ────────────────────────────────────────────────────────────
export default function AdminDashboard({
  pendingUsers,
  quotes,
  adminEmail,
}: {
  pendingUsers: PendingUser[];
  quotes: QuoteRequest[];
  adminEmail: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [tab, setTab] = useState<"approvals" | "quotes">("approvals");

  // Per-row loading keys
  const [approving, setApproving] = useState<Record<string, boolean>>({});
  const [sendingInvoice, setSendingInvoice] = useState<Record<string, boolean>>({});
  const [advancingStatus, setAdvancingStatus] = useState<Record<string, boolean>>({});
  const [deleting, setDeleting] = useState<Record<string, boolean>>({});

  // Optimistic delete — rows removed immediately on success
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());

  // Price input state for each pending quote
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [invoiceErrors, setInvoiceErrors] = useState<Record<string, string>>({});

  // ── Actions ─────────────────────────────────────────────────────────────────
  async function approveUser(userId: string) {
    setApproving((p) => ({ ...p, [userId]: true }));
    try {
      const res = await fetch("/api/admin/approve-user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId }),
      });
      if (!res.ok) {
        const { error } = await res.json();
        alert(`Approval failed: ${error}`);
        return;
      }
      startTransition(() => router.refresh());
    } finally {
      setApproving((p) => ({ ...p, [userId]: false }));
    }
  }

  async function sendInvoice(quoteId: string) {
    const raw = prices[quoteId] ?? "";
    const priceUsd = parseFloat(raw);
    if (!raw || isNaN(priceUsd) || priceUsd <= 0) {
      setInvoiceErrors((p) => ({ ...p, [quoteId]: "Enter a valid price" }));
      return;
    }
    setInvoiceErrors((p) => ({ ...p, [quoteId]: "" }));
    setSendingInvoice((p) => ({ ...p, [quoteId]: true }));
    try {
      const res = await fetch("/api/admin/send-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quote_id: quoteId, price_usd: priceUsd }),
      });
      const data = await res.json();
      if (!res.ok) {
        setInvoiceErrors((p) => ({ ...p, [quoteId]: data.error ?? "Failed" }));
        return;
      }
      setPrices((p) => ({ ...p, [quoteId]: "" }));
      startTransition(() => router.refresh());
    } finally {
      setSendingInvoice((p) => ({ ...p, [quoteId]: false }));
    }
  }

  async function advanceStatus(quoteId: string, nextStatus: string) {
    setAdvancingStatus((p) => ({ ...p, [quoteId]: true }));
    try {
      const res = await fetch("/api/admin/quote-status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quote_id: quoteId, status: nextStatus }),
      });
      if (!res.ok) {
        const { error } = await res.json();
        alert(`Status update failed: ${error}`);
        return;
      }
      startTransition(() => router.refresh());
    } finally {
      setAdvancingStatus((p) => ({ ...p, [quoteId]: false }));
    }
  }

  async function deleteQuote(quoteId: string) {
    if (!confirm("Delete this quote request?")) return;
    setDeleting((p) => ({ ...p, [quoteId]: true }));
    try {
      const res = await fetch("/api/admin/delete-quote", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quote_id: quoteId }),
      });
      if (res.ok) setDeletedIds((prev) => new Set([...prev, quoteId]));
    } finally {
      setDeleting((p) => ({ ...p, [quoteId]: false }));
    }
  }

  // ── Group quotes by status ──────────────────────────────────────────────────
  const visibleQuotes = quotes.filter((q) => !deletedIds.has(q.id));
  const grouped = QUOTE_STATUS_ORDER.reduce<Record<string, QuoteRequest[]>>(
    (acc, s) => ({ ...acc, [s]: visibleQuotes.filter((q) => q.status === s) }),
    {}
  );
  const pendingQuoteCount = grouped.pending?.length ?? 0;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --bg: #0d0d0d; --bg2: #111; --bg3: #161616;
          --border: #1e1e1e; --border2: #242424;
          --orange: #f4621f; --text: #e8e8e8; --muted: #5a5a5a; --muted2: #888;
          --mono: 'Space Mono', monospace; --sans: 'Space Grotesk', sans-serif;
        }
        body { background: var(--bg); color: var(--text); font-family: var(--sans); -webkit-font-smoothing: antialiased; }

        /* nav */
        .adm-nav { display:flex; align-items:center; justify-content:space-between; height:42px; padding:0 1.5rem; background:var(--bg2); border-bottom:1px solid var(--border); position:sticky; top:0; z-index:10; }
        .adm-logo { font-family:var(--mono); font-size:0.7rem; letter-spacing:0.1em; color:var(--muted2); text-decoration:none; }
        .adm-logo span { color:var(--orange); }
        .adm-nav-right { display:flex; align-items:center; gap:1.2rem; }
        .adm-nav-link { font-family:var(--mono); font-size:0.56rem; letter-spacing:0.1em; color:var(--muted); text-decoration:none; text-transform:uppercase; background:none; border:none; cursor:pointer; }
        .adm-nav-link:hover { color:var(--text); }

        /* page shell */
        .adm-page { max-width:1100px; margin:0 auto; padding:1.5rem; }
        .adm-page-tag { font-family:var(--mono); font-size:0.56rem; letter-spacing:0.2em; color:var(--orange); text-transform:uppercase; margin-bottom:0.4rem; }
        .adm-page-title { font-family:var(--sans); font-weight:700; font-size:1.5rem; letter-spacing:-0.03em; line-height:1; }

        /* tabs */
        .adm-tabs { display:flex; gap:1px; background:var(--border); border:1px solid var(--border); width:fit-content; margin:1.5rem 0; }
        .adm-tab { padding:0.5rem 1.2rem; font-family:var(--sans); font-size:0.75rem; font-weight:600; border:none; cursor:pointer; background:var(--bg3); color:var(--muted2); transition:all 0.15s; display:flex; align-items:center; gap:0.4rem; }
        .adm-tab.active { background:var(--orange); color:#000; }
        .adm-tab-badge { font-family:var(--mono); font-size:0.52rem; padding:0.08rem 0.35rem; background:rgba(255,255,255,0.15); }
        .adm-tab.active .adm-tab-badge { background:rgba(0,0,0,0.2); }

        /* section header */
        .adm-section-hd { display:flex; align-items:center; gap:0.8rem; padding:0.6rem 0; margin-bottom:1px; }
        .adm-section-label { font-family:var(--mono); font-size:0.55rem; letter-spacing:0.16em; text-transform:uppercase; }
        .adm-section-count { font-family:var(--mono); font-size:0.55rem; color:var(--muted); background:var(--bg3); border:1px solid var(--border2); padding:0.12rem 0.4rem; }
        .adm-section-line { flex:1; height:1px; background:var(--border); }

        /* table */
        .adm-table-wrap { overflow-x:auto; border:1px solid var(--border); margin-bottom:2rem; }
        table { width:100%; border-collapse:collapse; font-size:0.76rem; }
        thead { background:var(--bg2); border-bottom:1px solid var(--border); }
        th { text-align:left; padding:0.55rem 0.8rem; font-family:var(--mono); font-size:0.52rem; letter-spacing:0.12em; color:var(--muted); text-transform:uppercase; font-weight:400; white-space:nowrap; }
        td { padding:0.65rem 0.8rem; border-bottom:1px solid var(--border); vertical-align:middle; }
        tr:last-child td { border-bottom:none; }
        tr:hover td { background:var(--bg2); }

        /* cell helpers */
        .cell-name { font-weight:600; font-size:0.8rem; color:var(--text); }
        .cell-sub { font-size:0.68rem; color:var(--muted2); margin-top:0.15rem; }
        .cell-mono { font-family:var(--mono); font-size:0.62rem; color:var(--muted2); line-height:1.65; }
        .cell-mono b { color:var(--text); }
        .cell-price { font-family:var(--mono); font-weight:700; font-size:0.88rem; }

        /* price input row */
        .price-row { display:flex; gap:0.4rem; align-items:center; }
        .price-input { background:#1a1a1a; border:1px solid var(--border2); color:var(--text); font-family:var(--mono); font-size:0.7rem; padding:0.38rem 0.55rem; width:84px; outline:none; }
        .price-input:focus { border-color:var(--orange); }
        .price-input::placeholder { color:var(--muted); }
        .price-error { font-family:var(--mono); font-size:0.55rem; color:#ff5555; margin-top:0.25rem; }

        /* action buttons */
        .btn { font-family:var(--mono); font-size:0.56rem; letter-spacing:0.08em; text-transform:uppercase; border:none; cursor:pointer; padding:0.38rem 0.75rem; transition:all 0.15s; white-space:nowrap; }
        .btn:disabled { opacity:0.4; cursor:not-allowed; }
        .btn-orange { background:var(--orange); color:#000; }
        .btn-orange:hover:not(:disabled) { background:#d9541a; }
        .btn-ghost { background:transparent; color:var(--muted2); border:1px solid var(--border2); }
        .btn-ghost:hover:not(:disabled) { color:var(--text); border-color:var(--muted); }
        .btn-blue { background:#1a3a4a; color:#4db6f0; border:1px solid #0e2a3a; }
        .btn-blue:hover:not(:disabled) { background:#1e4a5a; }
        .btn-green { background:#0a2a0a; color:#6abf69; border:1px solid #1a3a1a; }
        .btn-green:hover:not(:disabled) { background:#0e3a0e; }
        .btn-red { background:#2a0a0a; color:#ff5555; border:1px solid #3a1a1a; }
        .btn-red:hover:not(:disabled) { background:#3a0e0e; }

        /* empty state */
        .adm-empty { padding:2rem; text-align:center; font-family:var(--mono); font-size:0.65rem; color:var(--muted); letter-spacing:0.1em; text-transform:uppercase; border:1px solid var(--border); margin-bottom:2rem; }
      `}</style>

      {/* ── Nav ── */}
      <nav className="adm-nav">
        <a href="/" className="adm-logo">
          Create<span>3D</span>Parts <span style={{ opacity: 0.4, marginLeft: 8 }}>/ Admin</span>
        </a>
        <div className="adm-nav-right">
          <span style={{ fontFamily: "var(--mono)", fontSize: "0.56rem", color: "var(--muted)" }}>
            {adminEmail}
          </span>
          <a href="/" className="adm-nav-link">← Site</a>
          <SignOutBtn />
        </div>
      </nav>

      <div className="adm-page">
        {/* ── Header ── */}
        <div style={{ marginBottom: "0.5rem" }}>
          <p className="adm-page-tag">// Admin</p>
          <h1 className="adm-page-title">Dashboard</h1>
        </div>

        {/* ── Tabs ── */}
        <div className="adm-tabs">
          <button
            className={`adm-tab${tab === "approvals" ? " active" : ""}`}
            onClick={() => setTab("approvals")}
          >
            Approvals
            {pendingUsers.length > 0 && (
              <span className="adm-tab-badge">{pendingUsers.length}</span>
            )}
          </button>
          <button
            className={`adm-tab${tab === "quotes" ? " active" : ""}`}
            onClick={() => setTab("quotes")}
          >
            Quotes
            {pendingQuoteCount > 0 && (
              <span className="adm-tab-badge">{pendingQuoteCount}</span>
            )}
          </button>
        </div>

        {/* ══ APPROVALS TAB ══════════════════════════════════════════════════ */}
        {tab === "approvals" && (
          <>
            {pendingUsers.length === 0 ? (
              <div className="adm-empty">No pending approvals</div>
            ) : (
              <div className="adm-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Signed up</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingUsers.map((u) => (
                      <tr key={u.id}>
                        <td>
                          <div className="cell-name">{u.full_name ?? "(no name)"}</div>
                          <div className="cell-sub">{u.email}</div>
                        </td>
                        <td>
                          <span className="cell-mono">{fmt(u.created_at)}</span>
                        </td>
                        <td>
                          <button
                            className="btn btn-orange"
                            disabled={approving[u.id]}
                            onClick={() => approveUser(u.id)}
                          >
                            {approving[u.id] ? "Approving…" : "Approve →"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* ══ QUOTES TAB ════════════════════════════════════════════════════ */}
        {tab === "quotes" && (
          <>
            {/* ── Pending (needs pricing) ── */}
            <QuoteSection
              label="Pending"
              status="pending"
              count={grouped.pending?.length ?? 0}
            >
              {grouped.pending?.length === 0 ? (
                <div className="adm-empty">No pending quotes</div>
              ) : (
                <div className="adm-table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Submitted</th>
                        <th>Customer</th>
                        <th>Spec</th>
                        <th>File</th>
                        <th>Notes</th>
                        <th>Set Price &amp; Invoice</th>
                      </tr>
                    </thead>
                    <tbody>
                      {grouped.pending?.map((q) => (
                        <tr key={q.id}>
                          <td><span className="cell-mono">{fmt(q.created_at)}</span></td>
                          <td>
                            <div className="cell-name">{q.customer_name ?? "—"}</div>
                            <div className="cell-sub">{q.customer_email}</div>
                            {q.customer_phone && <div className="cell-sub">{q.customer_phone}</div>}
                          </td>
                          <td>
                            <div className="cell-mono">
                              <b>{q.material}</b> / {q.color} / {q.quality}<br />
                              Qty <b>{q.quantity}</b>
                              {q.deadline && <><br />Due: <b>{q.deadline}</b></>}
                            </div>
                          </td>
                          <td>
                            <span className="cell-mono">{q.file_name ?? "—"}</span>
                          </td>
                          <td>
                            <span style={{ fontSize: "0.78rem", color: "var(--muted2)", maxWidth: 200, display: "block", lineHeight: 1.5 }}>
                              {q.notes ?? "—"}
                            </span>
                          </td>
                          <td>
                            <div className="price-row">
                              <span style={{ fontFamily: "var(--mono)", fontSize: "0.72rem", color: "var(--muted)" }}>$</span>
                              <input
                                className="price-input"
                                type="number"
                                min="0.01"
                                step="0.01"
                                placeholder="0.00"
                                value={prices[q.id] ?? ""}
                                onChange={(e) =>
                                  setPrices((p) => ({ ...p, [q.id]: e.target.value }))
                                }
                                onKeyDown={(e) => e.key === "Enter" && sendInvoice(q.id)}
                              />
                              <button
                                className="btn btn-orange"
                                disabled={sendingInvoice[q.id]}
                                onClick={() => sendInvoice(q.id)}
                              >
                                {sendingInvoice[q.id] ? "Sending…" : "Send Invoice"}
                              </button>
                              <button
                                className="btn btn-red"
                                disabled={deleting[q.id]}
                                onClick={() => deleteQuote(q.id)}
                              >
                                {deleting[q.id] ? "…" : "Del"}
                              </button>
                            </div>
                            {invoiceErrors[q.id] && (
                              <div className="price-error">{invoiceErrors[q.id]}</div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </QuoteSection>

            {/* ── Priced (awaiting client payment) ── */}
            <QuoteSection
              label="Priced — Awaiting Payment"
              status="priced"
              count={grouped.priced?.length ?? 0}
            >
              {grouped.priced?.length === 0 ? (
                <div className="adm-empty">None waiting for payment</div>
              ) : (
                <div className="adm-table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Sent</th>
                        <th>Customer</th>
                        <th>Spec</th>
                        <th>Price</th>
                        <th>Payment Link</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {grouped.priced?.map((q) => (
                        <tr key={q.id}>
                          <td><span className="cell-mono">{fmt(q.created_at)}</span></td>
                          <td>
                            <div className="cell-name">{q.customer_name ?? "—"}</div>
                            <div className="cell-sub">{q.customer_email}</div>
                          </td>
                          <td>
                            <div className="cell-mono">
                              <b>{q.material}</b> / {q.color} / {q.quality}<br />
                              Qty <b>{q.quantity}</b>
                            </div>
                          </td>
                          <td>
                            <span className="cell-price" style={{ color: "#f0b429" }}>
                              ${q.price_cents ? (q.price_cents / 100).toFixed(2) : "—"}
                            </span>
                          </td>
                          <td>
                            {q.stripe_payment_link ? (
                              <a
                                href={q.stripe_payment_link}
                                target="_blank"
                                rel="noreferrer"
                                className="btn btn-ghost"
                                style={{ display: "inline-block", textDecoration: "none" }}
                              >
                                View Link ↗
                              </a>
                            ) : (
                              <span style={{ color: "var(--muted)", fontSize: "0.75rem" }}>—</span>
                            )}
                          </td>
                          <td>
                            <button
                              className="btn btn-red"
                              disabled={deleting[q.id]}
                              onClick={() => deleteQuote(q.id)}
                            >
                              {deleting[q.id] ? "…" : "Del"}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </QuoteSection>

            {/* ── Paid (ready to start printing) ── */}
            <AdvanceSection
              label="Paid — Ready to Print"
              status="paid"
              quotes={grouped.paid ?? []}
              advancing={advancingStatus}
              onAdvance={advanceStatus}
              btnClass="btn-orange"
              deleting={deleting}
              onDelete={deleteQuote}
            />

            {/* ── Printing ── */}
            <AdvanceSection
              label="Printing"
              status="printing"
              quotes={grouped.printing ?? []}
              advancing={advancingStatus}
              onAdvance={advanceStatus}
              btnClass="btn-blue"
              deleting={deleting}
              onDelete={deleteQuote}
            />

            {/* ── Shipped ── */}
            <AdvanceSection
              label="Shipped"
              status="shipped"
              quotes={grouped.shipped ?? []}
              advancing={advancingStatus}
              onAdvance={advanceStatus}
              btnClass="btn-green"
              deleting={deleting}
              onDelete={deleteQuote}
            />

            {/* ── Complete (read-only archive) ── */}
            <QuoteSection
              label="Complete"
              status="complete"
              count={grouped.complete?.length ?? 0}
              collapsed
            >
              {grouped.complete?.length === 0 ? (
                <div className="adm-empty">No completed orders yet</div>
              ) : (
                <div className="adm-table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Completed</th>
                        <th>Customer</th>
                        <th>Spec</th>
                        <th>Total</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {grouped.complete?.map((q) => (
                        <tr key={q.id}>
                          <td><span className="cell-mono">{fmt(q.created_at)}</span></td>
                          <td>
                            <div className="cell-name">{q.customer_name ?? "—"}</div>
                            <div className="cell-sub">{q.customer_email}</div>
                          </td>
                          <td>
                            <div className="cell-mono">
                              <b>{q.material}</b> / {q.color} / {q.quality}<br />
                              Qty <b>{q.quantity}</b>
                            </div>
                          </td>
                          <td>
                            <span className="cell-price" style={{ color: "#6abf69" }}>
                              ${q.price_cents ? (q.price_cents / 100).toFixed(2) : "—"}
                            </span>
                          </td>
                          <td>
                            <button
                              className="btn btn-red"
                              disabled={deleting[q.id]}
                              onClick={() => deleteQuote(q.id)}
                            >
                              {deleting[q.id] ? "…" : "Del"}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </QuoteSection>
          </>
        )}
      </div>
    </>
  );
}

// ── Section header wrapper ────────────────────────────────────────────────────
function QuoteSection({
  label,
  status,
  count,
  children,
  collapsed: defaultCollapsed = false,
}: {
  label: string;
  status: string;
  count: number;
  children: React.ReactNode;
  collapsed?: boolean;
}) {
  const [open, setOpen] = useState(!defaultCollapsed);
  const cfg = STATUS_CONFIG[status] ?? { color: "#5a5a5a", bg: "#111", border: "#2a2a2a", label };

  return (
    <div style={{ marginBottom: "0.5rem" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          width: "100%",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: "0.75rem 0",
          textAlign: "left",
        }}
      >
        <span
          className="adm-section-label"
          style={{ color: cfg.color, fontFamily: "var(--mono)", fontSize: "0.6rem", letterSpacing: "0.16em", textTransform: "uppercase" }}
        >
          {label}
        </span>
        <span
          className="adm-section-count"
          style={{ fontFamily: "var(--mono)", fontSize: "0.6rem", color: "var(--muted)", background: "var(--bg3)", border: "1px solid var(--border2)", padding: "0.15rem 0.5rem" }}
        >
          {count}
        </span>
        <span style={{ flex: 1, height: 1, background: "var(--border)", display: "block" }} />
        <span style={{ fontFamily: "var(--mono)", fontSize: "0.62rem", color: "var(--muted)" }}>
          {open ? "▲" : "▼"}
        </span>
      </button>
      {open && children}
    </div>
  );
}

// ── Status-advance section (paid/printing/shipped) ────────────────────────────
function AdvanceSection({
  label,
  status,
  quotes,
  advancing,
  onAdvance,
  btnClass,
  deleting,
  onDelete,
}: {
  label: string;
  status: string;
  quotes: QuoteRequest[];
  advancing: Record<string, boolean>;
  onAdvance: (id: string, next: string) => void;
  btnClass: string;
  deleting: Record<string, boolean>;
  onDelete: (id: string) => void;
}) {
  const action = ADVANCE_ACTION[status];

  return (
    <QuoteSection label={label} status={status} count={quotes.length}>
      {quotes.length === 0 ? (
        <div className="adm-empty">Nothing here</div>
      ) : (
        <div className="adm-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Customer</th>
                <th>Spec</th>
                <th>File</th>
                <th>Total</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((q) => (
                <tr key={q.id}>
                  <td><span className="cell-mono">{fmt(q.created_at)}</span></td>
                  <td>
                    <div className="cell-name">{q.customer_name ?? "—"}</div>
                    <div className="cell-sub">{q.customer_email}</div>
                    {q.customer_phone && <div className="cell-sub">{q.customer_phone}</div>}
                  </td>
                  <td>
                    <div className="cell-mono">
                      <b>{q.material}</b> / {q.color} / {q.quality}<br />
                      Qty <b>{q.quantity}</b>
                      {q.deadline && <><br />Due: <b>{q.deadline}</b></>}
                    </div>
                  </td>
                  <td>
                    <span className="cell-mono">{q.file_name ?? "—"}</span>
                  </td>
                  <td>
                    <span className="cell-price" style={{ color: "#6abf69" }}>
                      ${q.price_cents ? (q.price_cents / 100).toFixed(2) : "—"}
                    </span>
                  </td>
                  <td style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    {action && (
                      <button
                        className={`btn ${btnClass}`}
                        disabled={advancing[q.id]}
                        onClick={() => onAdvance(q.id, action.next)}
                      >
                        {advancing[q.id] ? "Updating…" : action.label}
                      </button>
                    )}
                    <button
                      className="btn btn-red"
                      disabled={deleting[q.id]}
                      onClick={() => onDelete(q.id)}
                    >
                      {deleting[q.id] ? "…" : "Del"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </QuoteSection>
  );
}

// ── Sign-out button ───────────────────────────────────────────────────────────
function SignOutBtn() {
  const router = useRouter();
  return (
    <button
      className="adm-nav-link"
      onClick={async () => {
        const { createClient } = await import("@/utils/supabase/client");
        await createClient().auth.signOut();
        router.replace("/");
      }}
    >
      Sign out
    </button>
  );
}

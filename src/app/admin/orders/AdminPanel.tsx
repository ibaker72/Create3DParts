"use client";

import { useState } from "react";

type Order = {
  id: string;
  created_at: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  customer_city: string | null;
  material: string;
  color: string;
  quality: string;
  quantity: number;
  price_cents: number;
  status: string;
  stripe_payment_status: string;
  file_name: string;
  file_path: string;
  deadline: string | null;
  notes: string | null;
};

type Quote = {
  id: string;
  created_at: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  customer_city: string | null;
  material: string;
  color: string;
  quality: string;
  quantity: number;
  deadline: string;
  notes: string;
  status: string;
};

const STATUS_COLORS: Record<string, string> = {
  paid:      "#2ecc71",
  pending:   "#f4621f",
  unpaid:    "#888",
  quoted:    "#3498db",
  accepted:  "#2ecc71",
  declined:  "#e74c3c",
};

function StatusBadge({ s }: { s: string }) {
  return (
    <span style={{
      fontFamily: "var(--mono)",
      fontSize: "0.62rem",
      letterSpacing: "0.1em",
      textTransform: "uppercase",
      color: STATUS_COLORS[s] ?? "#888",
      border: `1px solid ${STATUS_COLORS[s] ?? "#888"}40`,
      padding: "0.2rem 0.5rem",
      whiteSpace: "nowrap",
    }}>
      {s}
    </span>
  );
}

function fmt(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit",
  });
}

export default function AdminPanel({ orders, quotes }: { orders: Order[]; quotes: Quote[] }) {
  const [tab, setTab] = useState<"orders" | "quotes">("orders");
  const pendingQuotes = quotes.filter((q) => q.status === "pending").length;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Barlow:wght@300;400;600;700&family=Barlow+Condensed:wght@900&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --bg:#0d0d0d; --bg2:#141414; --bg3:#1c1c1c;
          --border:#242424; --border2:#2e2e2e;
          --orange:#f4621f; --text:#e8e8e8; --muted:#555; --muted2:#888;
          --mono:'Space Mono',monospace; --sans:'Barlow',sans-serif; --cond:'Barlow Condensed',sans-serif;
        }
        body { background:var(--bg); color:var(--text); font-family:var(--sans); -webkit-font-smoothing:antialiased; }

        .nav { display:flex; align-items:center; justify-content:space-between; padding:0 2rem; height:56px; background:var(--bg2); border-bottom:1px solid var(--border); }
        .nav-logo { font-family:var(--mono); font-size:0.8rem; letter-spacing:0.12em; color:var(--muted2); text-decoration:none; }
        .nav-logo span { color:var(--orange); }
        .nav-right { display:flex; align-items:center; gap:1.5rem; }
        .nav-link { font-family:var(--mono); font-size:0.65rem; letter-spacing:0.1em; color:var(--muted2); text-decoration:none; text-transform:uppercase; }
        .nav-link:hover { color:var(--text); }

        .page { max-width:1300px; margin:0 auto; padding:2rem; }
        .page-header { margin-bottom:2rem; }
        .page-tag { font-family:var(--mono); font-size:0.65rem; letter-spacing:0.2em; color:var(--orange); text-transform:uppercase; margin-bottom:0.5rem; }
        .page-title { font-family:var(--cond); font-weight:900; font-size:2.4rem; text-transform:uppercase; line-height:1; }
        .page-sub { font-size:0.88rem; color:var(--muted2); margin-top:0.4rem; }

        /* TABS */
        .tabs { display:flex; gap:1px; background:var(--border); border:1px solid var(--border); margin-bottom:2rem; width:fit-content; }
        .tab { padding:0.65rem 1.5rem; font-family:var(--sans); font-size:0.82rem; font-weight:600; letter-spacing:0.05em; border:none; cursor:pointer; background:var(--bg3); color:var(--muted2); transition:all 0.15s; display:flex; align-items:center; gap:0.5rem; }
        .tab.active { background:var(--orange); color:#000; }
        .tab-badge { font-family:var(--mono); font-size:0.6rem; background:#000; color:var(--orange); padding:0.1rem 0.4rem; border-radius:2px; }
        .tab.active .tab-badge { background:rgba(0,0,0,0.25); color:#000; }

        /* TABLE */
        .table-wrap { overflow-x:auto; border:1px solid var(--border); border-radius:0; }
        table { width:100%; border-collapse:collapse; font-size:0.83rem; }
        thead { background:var(--bg2); border-bottom:1px solid var(--border); }
        th { text-align:left; padding:0.8rem 1rem; font-family:var(--mono); font-size:0.6rem; letter-spacing:0.12em; color:var(--muted2); text-transform:uppercase; white-space:nowrap; font-weight:400; }
        td { padding:0.9rem 1rem; border-bottom:1px solid var(--border); vertical-align:top; }
        tr:last-child td { border-bottom:none; }
        tr:hover td { background:var(--bg2); }
        .name { font-weight:600; font-size:0.88rem; }
        .email { font-size:0.78rem; color:var(--muted2); margin-top:0.15rem; }
        .phone { font-size:0.75rem; color:var(--muted); margin-top:0.1rem; font-family:var(--mono); }
        .spec { font-family:var(--mono); font-size:0.72rem; color:var(--muted2); line-height:1.7; }
        .spec b { color:var(--text); }
        .notes-cell { font-size:0.78rem; color:var(--muted2); max-width:260px; line-height:1.5; }
        .file-link { font-family:var(--mono); font-size:0.65rem; color:var(--orange); text-decoration:none; display:block; margin-top:0.3rem; letter-spacing:0.05em; }
        .file-link:hover { text-decoration:underline; }
        .filename { font-family:var(--mono); font-size:0.7rem; color:var(--muted2); }
        .price { font-family:var(--cond); font-weight:700; font-size:1.1rem; color:var(--text); }
        .date { font-family:var(--mono); font-size:0.68rem; color:var(--muted2); white-space:nowrap; }
        .reply-btn { display:inline-block; margin-top:0.4rem; font-family:var(--mono); font-size:0.62rem; letter-spacing:0.08em; color:var(--orange); border:1px solid var(--orange)30; padding:0.2rem 0.6rem; text-decoration:none; transition:all 0.15s; }
        .reply-btn:hover { background:var(--orange); color:#000; }
        .empty { padding:3rem 2rem; text-align:center; font-family:var(--mono); font-size:0.75rem; color:var(--muted); letter-spacing:0.1em; text-transform:uppercase; }
      `}</style>

      <nav className="nav">
        <a href="/" className="nav-logo">BAMBU<span>-</span>PRINTS</a>
        <div className="nav-right">
          <a href="/" className="nav-link">← Site</a>
          <LogoutBtn />
        </div>
      </nav>

      <div className="page">
        <div className="page-header">
          <p className="page-tag">// Admin</p>
          <h1 className="page-title">Orders</h1>
          <p className="page-sub">Internal view — do not share this URL.</p>
        </div>

        <div className="tabs">
          <button className={`tab${tab === "orders" ? " active" : ""}`} onClick={() => setTab("orders")}>
            Stripe Orders
            <span className="tab-badge">{orders.length}</span>
          </button>
          <button className={`tab${tab === "quotes" ? " active" : ""}`} onClick={() => setTab("quotes")}>
            Quote Requests
            {pendingQuotes > 0 && <span className="tab-badge">{pendingQuotes}</span>}
          </button>
        </div>

        {tab === "orders" && (
          <div className="table-wrap">
            {orders.length === 0 ? (
              <div className="empty">No orders yet</div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Customer</th>
                    <th>Spec</th>
                    <th>Price</th>
                    <th>Payment</th>
                    <th>Status</th>
                    <th>File</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id}>
                      <td><span className="date">{fmt(o.created_at)}</span></td>
                      <td>
                        <div className="name">{o.customer_name}</div>
                        <div className="email">{o.customer_email}</div>
                        {o.customer_phone && <div className="phone">{o.customer_phone}</div>}
                        {o.customer_city  && <div className="phone">{o.customer_city}</div>}
                      </td>
                      <td>
                        <div className="spec">
                          <b>{o.material}</b> / {o.color} / {o.quality}<br />
                          Qty <b>{o.quantity}</b>
                          {o.deadline && <><br />Deadline: <b>{o.deadline}</b></>}
                        </div>
                      </td>
                      <td><span className="price">${(o.price_cents / 100).toFixed(2)}</span></td>
                      <td><StatusBadge s={o.stripe_payment_status} /></td>
                      <td><StatusBadge s={o.status} /></td>
                      <td>
                        <div className="filename">{o.file_name}</div>
                        <a className="file-link" href={`/api/orders/${o.id}/download`} target="_blank" rel="noreferrer">
                          ↓ Download STL
                        </a>
                      </td>
                      <td>
                        {o.notes
                          ? <div className="notes-cell">{o.notes}</div>
                          : <span style={{ color: "var(--muted)", fontSize: "0.75rem" }}>—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {tab === "quotes" && (
          <div className="table-wrap">
            {quotes.length === 0 ? (
              <div className="empty">No quote requests yet</div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Customer</th>
                    <th>Spec</th>
                    <th>Status</th>
                    <th>Deadline</th>
                    <th>Notes / Description</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {quotes.map((q) => (
                    <tr key={q.id}>
                      <td><span className="date">{fmt(q.created_at)}</span></td>
                      <td>
                        <div className="name">{q.customer_name}</div>
                        <div className="email">{q.customer_email}</div>
                        {q.customer_phone && <div className="phone">{q.customer_phone}</div>}
                        {q.customer_city  && <div className="phone">{q.customer_city}</div>}
                      </td>
                      <td>
                        <div className="spec">
                          <b>{q.material}</b> / {q.color} / {q.quality}<br />
                          Qty <b>{q.quantity}</b>
                        </div>
                      </td>
                      <td><StatusBadge s={q.status} /></td>
                      <td><span className="spec">{q.deadline}</span></td>
                      <td><div className="notes-cell">{q.notes}</div></td>
                      <td>
                        <a
                          className="reply-btn"
                          href={`mailto:${q.customer_email}?subject=Re: Your Bambu-prints quote request&body=Hi ${q.customer_name},%0A%0AThanks for reaching out! Here's your quote:%0A%0A`}
                        >
                          Reply →
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </>
  );
}

function LogoutBtn() {
  return (
    <button
      className="nav-link"
      style={{ background: "none", border: "none", cursor: "pointer" }}
      onClick={async () => {
        const { createClient } = await import("@/utils/supabase/client");
        await createClient().auth.signOut();
        window.location.href = "/login";
      }}
    >
      Sign out
    </button>
  );
}

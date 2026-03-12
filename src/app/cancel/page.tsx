export default async function CancelPage({
  searchParams,
}: {
  searchParams: Promise<{ order_id?: string }>;
}) {
  const { order_id: orderId } = await searchParams;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=DM+Sans:wght@300;400;600;700&family=Space+Grotesk:wght@500;600;700&display=swap');
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
        :root {
          --bg:#0a0a0a; --bg2:#0f0f0f; --bg3:#131313;
          --border:#1e1e1e; --border2:#282828;
          --orange:#f4621f;
          --text:#efefef; --muted:#5a5a5a; --muted2:#a0a0a0;
          --mono:'Space Mono',monospace; --sans:'DM Sans',sans-serif; --display:'Space Grotesk',sans-serif;
        }
        body { background:var(--bg); color:var(--text); font-family:var(--sans); -webkit-font-smoothing:antialiased; min-height:100vh; }

        .nav { display:flex; align-items:center; padding:0 2rem; height:58px; border-bottom:1px solid var(--border); background:rgba(10,10,10,0.92); backdrop-filter:blur(16px); }
        .nav-logo { font-family:var(--display); font-size:1rem; font-weight:700; letter-spacing:-0.02em; color:var(--text); text-decoration:none; }
        .nav-logo span { color:var(--orange); }

        .wrap { min-height:calc(100vh - 58px); display:flex; align-items:center; justify-content:center; padding:3rem 2rem; }
        .card { width:100%; max-width:480px; background:var(--bg2); border:1px solid var(--border); padding:3rem 2.5rem; text-align:center; }

        .icon { width:56px; height:56px; border-radius:50%; background:rgba(244,98,31,0.1); border:1px solid rgba(244,98,31,0.3); display:flex; align-items:center; justify-content:center; margin:0 auto 1.5rem; font-size:1.3rem; color:var(--orange); }
        .tag { font-family:var(--mono); font-size:0.6rem; letter-spacing:0.2em; color:var(--orange); text-transform:uppercase; margin-bottom:0.75rem; }
        h1 { font-family:var(--display); font-weight:700; font-size:1.6rem; letter-spacing:-0.03em; margin-bottom:1rem; }
        .sub { font-size:0.9rem; color:var(--muted2); line-height:1.7; margin-bottom:2rem; }

        .actions { display:flex; flex-direction:column; gap:0.8rem; align-items:center; }
        .btn-primary { font-family:var(--mono); font-size:0.72rem; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; background:var(--orange); color:#000; border:none; padding:0.85rem 1.5rem; cursor:pointer; text-decoration:none; display:inline-block; transition:background 0.15s; }
        .btn-primary:hover { background:#ff7340; }
        .btn-ghost { font-family:var(--mono); font-size:0.68rem; letter-spacing:0.1em; color:var(--muted); text-decoration:none; text-transform:uppercase; }
        .btn-ghost:hover { color:var(--text); }

        .order-id { font-family:var(--mono); font-size:0.65rem; color:var(--muted); margin-top:1.5rem; letter-spacing:0.06em; }
        .order-id span { color:var(--muted2); }

        .contact { font-family:var(--mono); font-size:0.62rem; color:var(--muted); margin-top:1.5rem; letter-spacing:0.06em; }
        .contact a { color:var(--orange); text-decoration:none; }
        .contact a:hover { text-decoration:underline; }
      `}</style>

      <nav className="nav">
        <a href="/" className="nav-logo">Create<span>3D</span>Parts</a>
      </nav>

      <div className="wrap">
        <div className="card">
          <div className="icon">&#x2715;</div>

          <p className="tag">// Checkout canceled</p>
          <h1>Payment not completed</h1>
          <p className="sub">
            No worries — nothing has been charged. You can return to the site and try again whenever you&apos;re ready.
          </p>

          <div className="actions">
            <a href="/" className="btn-primary">← Back to home</a>
            <a href="/#quote" className="btn-ghost">Request a new quote</a>
          </div>

          {orderId && (
            <p className="order-id">
              Order ref: <span>{orderId}</span>
            </p>
          )}

          <p className="contact">
            Questions? Email <a href="mailto:billing@create3dparts.com">billing@create3dparts.com</a>
          </p>
        </div>
      </div>
    </>
  );
}

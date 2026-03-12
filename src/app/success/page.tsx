export default async function SuccessPage({
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
          --orange:#f4621f; --green:#2ecc71;
          --text:#efefef; --muted:#5a5a5a; --muted2:#a0a0a0;
          --mono:'Space Mono',monospace; --sans:'DM Sans',sans-serif; --display:'Space Grotesk',sans-serif;
        }
        body { background:var(--bg); color:var(--text); font-family:var(--sans); -webkit-font-smoothing:antialiased; min-height:100vh; }

        .nav { display:flex; align-items:center; padding:0 2rem; height:58px; border-bottom:1px solid var(--border); background:rgba(10,10,10,0.92); backdrop-filter:blur(16px); }
        .nav-logo { font-family:var(--display); font-size:1rem; font-weight:700; letter-spacing:-0.02em; color:var(--text); text-decoration:none; }
        .nav-logo span { color:var(--orange); }

        .wrap { min-height:calc(100vh - 58px); display:flex; align-items:center; justify-content:center; padding:3rem 2rem; }
        .card { width:100%; max-width:560px; }

        .check { width:56px; height:56px; border-radius:50%; background:rgba(46,204,113,0.12); border:2px solid var(--green); display:flex; align-items:center; justify-content:center; margin-bottom:2rem; }
        .check svg { width:24px; height:24px; stroke:var(--green); fill:none; stroke-width:2.5; stroke-linecap:round; stroke-linejoin:round; }

        .tag { font-family:var(--mono); font-size:0.65rem; letter-spacing:0.2em; color:var(--green); text-transform:uppercase; margin-bottom:0.8rem; }
        h1 { font-family:var(--display); font-weight:700; font-size:clamp(2rem,5vw,3rem); letter-spacing:-0.03em; line-height:1.1; margin-bottom:1rem; }
        .sub { font-size:1rem; font-weight:300; color:var(--muted2); line-height:1.7; margin-bottom:2.5rem; max-width:440px; }

        .steps { border:1px solid var(--border); background:var(--bg2); border-left:3px solid var(--orange); }
        .step { display:flex; gap:1.2rem; align-items:flex-start; padding:1.4rem 1.6rem; border-bottom:1px solid var(--border); }
        .step:last-child { border-bottom:none; }
        .step-n { font-family:var(--mono); font-size:0.6rem; letter-spacing:0.15em; color:var(--orange); padding-top:3px; flex-shrink:0; }
        .step-title { font-weight:700; font-size:0.9rem; margin-bottom:0.2rem; }
        .step-body { font-size:0.85rem; color:var(--muted2); line-height:1.6; }

        .order-id { font-family:var(--mono); font-size:0.7rem; letter-spacing:0.1em; color:var(--muted); margin-top:2rem; }
        .order-id span { color:var(--muted2); }

        .back { display:inline-block; margin-top:2rem; font-family:var(--mono); font-size:0.72rem; letter-spacing:0.1em; color:var(--muted2); text-decoration:none; border:1px solid var(--border2); padding:0.6rem 1.2rem; transition:all 0.15s; text-transform:uppercase; }
        .back:hover { color:var(--text); border-color:var(--muted); }

        .contact { font-family:var(--mono); font-size:0.65rem; color:var(--muted); margin-top:1.5rem; letter-spacing:0.06em; }
        .contact a { color:var(--orange); text-decoration:none; }
        .contact a:hover { text-decoration:underline; }
      `}</style>

      <nav className="nav">
        <a href="/" className="nav-logo">Create<span>3D</span>Parts</a>
      </nav>

      <div className="wrap">
        <div className="card">
          <div className="check">
            <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg>
          </div>

          <p className="tag">// Payment confirmed</p>
          <h1>You&apos;re all set.</h1>
          <p className="sub">
            Payment received. We&apos;ll review your file, prep the print, and reach out to coordinate pickup or confirm shipping.
          </p>

          <div className="steps">
            {[
              { n: "01", title: "File review",         body: "We\u2019ll check your file and confirm it\u2019s print-ready. If anything needs adjustment we\u2019ll be in touch." },
              { n: "02", title: "Printing",            body: "Once confirmed we start the print. You\u2019ll get a message when it\u2019s underway." },
              { n: "03", title: "Pickup or shipping",  body: "We\u2019ll contact you to arrange local pickup in North NJ or confirm your shipping address." },
            ].map((s) => (
              <div className="step" key={s.n}>
                <div className="step-n">{s.n}</div>
                <div>
                  <div className="step-title">{s.title}</div>
                  <div className="step-body">{s.body}</div>
                </div>
              </div>
            ))}
          </div>

          {orderId && (
            <p className="order-id">
              Order ID: <span>{orderId}</span>
            </p>
          )}

          <a href="/" className="back">← Back to home</a>
          <p className="contact">
            Questions? Email us at <a href="mailto:projects@create3dparts.com">projects@create3dparts.com</a>
          </p>
        </div>
      </div>
    </>
  );
}

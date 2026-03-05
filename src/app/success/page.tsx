export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ order_id?: string }>;
}) {
  const { order_id: orderId } = await searchParams;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Barlow:wght@300;400;600;700&family=Barlow+Condensed:wght@900&display=swap');
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
        :root {
          --bg:#0d0d0d; --bg2:#141414; --bg3:#1c1c1c;
          --border:#242424; --border2:#333;
          --orange:#f4621f; --green:#2ecc71;
          --text:#e8e8e8; --muted:#555; --muted2:#888;
          --mono:'Space Mono',monospace; --sans:'Barlow',sans-serif; --cond:'Barlow Condensed',sans-serif;
        }
        body { background:var(--bg); color:var(--text); font-family:var(--sans); -webkit-font-smoothing:antialiased; min-height:100vh; }

        .nav { display:flex; align-items:center; padding:0 2rem; height:56px; border-bottom:1px solid var(--border); }
        .nav-logo { font-family:var(--mono); font-size:0.85rem; letter-spacing:0.12em; color:var(--text); text-decoration:none; }
        .nav-logo span { color:var(--orange); }

        .wrap { min-height:calc(100vh - 56px); display:flex; align-items:center; justify-content:center; padding:3rem 2rem; }
        .card { width:100%; max-width:560px; }

        .check { width:56px; height:56px; border-radius:50%; background:rgba(46,204,113,0.12); border:2px solid var(--green); display:flex; align-items:center; justify-content:center; margin-bottom:2rem; }
        .check svg { width:24px; height:24px; stroke:var(--green); fill:none; stroke-width:2.5; stroke-linecap:round; stroke-linejoin:round; }

        .tag { font-family:var(--mono); font-size:0.65rem; letter-spacing:0.2em; color:var(--green); text-transform:uppercase; margin-bottom:0.8rem; }
        h1 { font-family:var(--cond); font-weight:900; font-size:clamp(2.4rem,6vw,4rem); text-transform:uppercase; line-height:0.95; margin-bottom:1rem; }
        .sub { font-size:1rem; font-weight:300; color:var(--muted2); line-height:1.7; margin-bottom:2.5rem; max-width:440px; }

        .steps { border:1px solid var(--border); background:var(--bg2); border-left:3px solid var(--orange); }
        .step { display:flex; gap:1.2rem; align-items:flex-start; padding:1.4rem 1.6rem; border-bottom:1px solid var(--border); }
        .step:last-child { border-bottom:none; }
        .step-n { font-family:var(--mono); font-size:0.6rem; letter-spacing:0.15em; color:var(--orange); padding-top:3px; flex-shrink:0; }
        .step-title { font-weight:700; font-size:0.9rem; margin-bottom:0.2rem; }
        .step-body { font-size:0.85rem; color:var(--muted2); line-height:1.6; }

        .order-id { font-family:var(--mono); font-size:0.7rem; letter-spacing:0.1em; color:var(--muted); margin-top:2rem; }
        .order-id span { color:var(--muted2); }

        .back { display:inline-block; margin-top:2rem; font-family:var(--mono); font-size:0.72rem; letter-spacing:0.1em; color:var(--muted2); text-decoration:none; border:1px solid var(--border2); padding:0.6rem 1.2rem; transition:all 0.15s; }
        .back:hover { color:var(--text); border-color:var(--muted); }
      `}</style>

      <nav className="nav">
        <a href="/" className="nav-logo">BAMBU<span>-</span>PRINTS</a>
      </nav>

      <div className="wrap">
        <div className="card">
          <div className="check">
            <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg>
          </div>

          <p className="tag">// Payment confirmed</p>
          <h1>You're<br />all set.</h1>
          <p className="sub">
            Payment received. We'll review your file, prep the print, and reach out to coordinate pickup or confirm shipping.
          </p>

          <div className="steps">
            {[
              { n: "01", title: "File review",         body: "We'll check your STL and confirm it's print-ready. If anything needs adjustment we'll be in touch." },
              { n: "02", title: "Printing",            body: "Once confirmed we start the print. You'll get a message when it's underway." },
              { n: "03", title: "Pickup or shipping",  body: "We'll contact you to arrange local pickup or confirm your shipping address." },
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
        </div>
      </div>
    </>
  );
}

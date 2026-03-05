"use client";

import { Suspense, useState } from "react";
import { createClient } from "@/utils/supabase/client";

const STYLES = `
  @import url(‘https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=DM+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap’);
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg:#0a0a0a; --bg2:#0d0d0d; --bg3:#131313;
    --border:#1e1e1e; --border2:#282828;
    --orange:#f4621f; --text:#efefef; --muted:#5a5a5a; --muted2:#a0a0a0;
    --mono:’Space Mono’,monospace; --sans:’DM Sans’,sans-serif; --display:’Space Grotesk’,sans-serif;
  }
  body { background:var(--bg); color:var(--text); font-family:var(--sans); -webkit-font-smoothing:antialiased; }
  .wrap { min-height:100vh; display:flex; align-items:center; justify-content:center; padding:2rem; flex-direction:column; gap:1rem; }
  .card { width:100%; max-width:420px; background:var(--bg2); border:1px solid var(--border); border-top:3px solid var(--orange); padding:2.5rem; }
  .logo { font-family:var(--display); font-size:1rem; font-weight:700; letter-spacing:-0.02em; color:var(--text); margin-bottom:0.5rem; display:block; text-decoration:none; }
  .logo span { color:var(--orange); }
  .backlink {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    font-family: var(--mono);
    font-size: 0.62rem;
    letter-spacing: 0.1em;
    color: var(--muted);
    text-decoration: none;
    text-transform: uppercase;
    margin-bottom: 1.5rem;
  }
  .backlink:hover { color: var(--muted2); }
  h1 { font-family:var(--display); font-weight:700; font-size:1.6rem; letter-spacing:-0.03em; margin-bottom:0.4rem; }
  .subtitle { font-size:0.88rem; color:var(--muted2); margin-bottom:2rem; line-height:1.6; }
  .field { display:flex; flex-direction:column; gap:0.4rem; margin-bottom:1rem; }
  label { font-family:var(--mono); font-size:0.62rem; letter-spacing:0.14em; color:var(--muted); text-transform:uppercase; }
  input { background:var(--bg3); border:1px solid var(--border2); color:var(--text); padding:0.75rem 1rem; font-family:var(--sans); font-size:0.9rem; outline:none; width:100%; transition:border-color 0.15s; }
  input:focus { border-color:var(--orange); }
  .btn { width:100%; margin-top:0.5rem; background:var(--orange); color:#000; font-family:var(--sans); font-weight:700; font-size:0.85rem; letter-spacing:0.05em; text-transform:uppercase; border:none; padding:0.9rem; cursor:pointer; transition:opacity 0.15s; }
  .btn:disabled { opacity:0.5; cursor:not-allowed; }
  .msg { font-family:var(--mono); font-size:0.72rem; margin-top:0.8rem; padding:0.6rem 0.8rem; border-radius:0; }
  .msg.err { color:#ff5555; border:1px solid #ff555430; background:#ff55550a; }
  .msg.ok { color:#6abf69; border:1px solid #6abf6930; background:#6abf690a; }
  .helper { font-family:var(--mono); font-size:0.62rem; color:var(--muted); text-align:center; line-height:1.7; max-width:420px; }
  .signup-link { color:var(--orange); text-decoration:none; }
  .signup-link:hover { text-decoration:underline; }
`;

function LoginForm({ redirectTo }: { redirectTo: string }) {
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);

    if (!email.includes("@")) return setMsg({ text: "Enter a valid email.", ok: false });
    if (!password) return setMsg({ text: "Enter your password.", ok: false });

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (error) return setMsg({ text: error.message, ok: false });

    window.location.href = redirectTo;
  }

  return (
    <div className="wrap">
      <div className="card">
        <a href="/" className="logo">
          Create<span>3D</span>Parts
        </a>

        <a href="/" className="backlink">← Back to site</a>

        <h1>Sign in</h1>
        <p className="subtitle">Sign in to view quotes, orders, and your account dashboard.</p>

        <form onSubmit={handleSignIn}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              autoFocus
              autoComplete="email"
            />
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          <button className="btn" type="submit" disabled={loading}>
            {loading ? "Signing in…" : "Sign In →"}
          </button>

          {msg && <p className={`msg ${msg.ok ? "ok" : "err"}`}>{msg.text}</p>}
        </form>
      </div>

      <p className="helper">
        New here?{" "}
        <a href="/signup" className="signup-link">Request access</a>
        {" "}to create an account.
      </p>
    </div>
  );
}

export default function LoginClient({ redirectTo }: { redirectTo: string }) {
  return (
    <>
      <style>{STYLES}</style>
      <Suspense fallback={<div style={{ minHeight: "100vh", background: "#0a0a0a" }} />}>
        <LoginForm redirectTo={redirectTo} />
      </Suspense>
    </>
  );
}
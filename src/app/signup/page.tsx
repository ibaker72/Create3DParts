"use client";

import { useState } from "react";
import Link from "next/link";

type Status = "idle" | "loading" | "success" | "error";

export default function SignupPage() {
  const [form, setForm] = useState({ full_name: "", email: "", password: "" });
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  function set(field: string, value: string) {
    setForm((p) => ({ ...p, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error ?? "Something went wrong. Please try again.");
        setStatus("error");
        return;
      }

      setStatus("success");
    } catch {
      setErrorMsg("Network error. Please try again.");
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <p style={tagStyle}>// Request Received</p>
          <h1 style={headingStyle}>You're on the list</h1>
          <p style={bodyStyle}>
            Thanks for signing up. We've received your request and will review
            your account shortly. You'll get an email with a login link once
            you're approved — usually within 24 hours.
          </p>
          <Link href="/" style={linkStyle}>
            &larr; Return to home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <p style={tagStyle}>// Create Account</p>
        <h1 style={{ ...headingStyle, marginBottom: "2rem" }}>Request Access</h1>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <Field label="Full Name">
            <input
              type="text"
              value={form.full_name}
              onChange={(e) => set("full_name", e.target.value)}
              required
              autoComplete="name"
              style={inputStyle}
            />
          </Field>

          <Field label="Email">
            <input
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              required
              autoComplete="email"
              style={inputStyle}
            />
          </Field>

          <Field label="Password">
            <input
              type="password"
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              style={inputStyle}
            />
            <span style={{ fontSize: "0.7rem", color: "#5a5a5a", marginTop: "0.35rem", display: "block" }}>
              Minimum 8 characters
            </span>
          </Field>

          {status === "error" && (
            <p style={{ fontSize: "0.8rem", color: "#ff5555", margin: 0 }}>{errorMsg}</p>
          )}

          <button
            type="submit"
            disabled={status === "loading"}
            style={{
              background: status === "loading" ? "#555" : "#f4621f",
              color: "#000",
              fontFamily: "'Space Mono', monospace",
              fontWeight: 700,
              fontSize: "0.72rem",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              border: "none",
              padding: "0.9rem 1.5rem",
              cursor: status === "loading" ? "not-allowed" : "pointer",
              width: "100%",
              marginTop: "0.5rem",
            }}
          >
            {status === "loading" ? "Submitting..." : "Request Access →"}
          </button>
        </form>

        <p style={{ fontSize: "0.78rem", color: "#5a5a5a", marginTop: "1.5rem", textAlign: "center" }}>
          Already have an account?{" "}
          <Link href="/login" style={{ color: "#f4621f", textDecoration: "none" }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
      <label
        style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: "0.6rem",
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "#888",
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#0d0d0d",
  padding: "2rem",
};

const cardStyle: React.CSSProperties = {
  maxWidth: 420,
  width: "100%",
  background: "#111",
  border: "1px solid #1e1e1e",
  padding: "3rem 2.5rem",
};

const tagStyle: React.CSSProperties = {
  fontFamily: "'Space Mono', monospace",
  fontSize: "0.6rem",
  letterSpacing: "0.2em",
  color: "#f4621f",
  textTransform: "uppercase",
  marginBottom: "0.5rem",
};

const headingStyle: React.CSSProperties = {
  fontFamily: "'Space Grotesk', sans-serif",
  fontWeight: 700,
  fontSize: "1.6rem",
  letterSpacing: "-0.03em",
  color: "#efefef",
};

const bodyStyle: React.CSSProperties = {
  fontSize: "0.88rem",
  color: "#888",
  lineHeight: 1.7,
  marginBottom: "1.5rem",
};

const inputStyle: React.CSSProperties = {
  background: "#1a1a1a",
  border: "1px solid #2a2a2a",
  color: "#efefef",
  fontFamily: "inherit",
  fontSize: "0.88rem",
  padding: "0.65rem 0.85rem",
  width: "100%",
  outline: "none",
  boxSizing: "border-box",
};

const linkStyle: React.CSSProperties = {
  fontFamily: "'Space Mono', monospace",
  fontSize: "0.68rem",
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "#5a5a5a",
  textDecoration: "none",
};

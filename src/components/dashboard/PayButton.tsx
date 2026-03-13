"use client";

import { useState } from "react";

export default function PayButton({
  requestId,
  priceCents,
}: {
  requestId: string;
  priceCents: number;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePay() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/quote-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to start checkout");
      window.location.href = data.url;
    } catch (e: any) {
      setError(e.message);
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.5rem" }}>
      <button
        onClick={handlePay}
        disabled={loading}
        style={{
          background: loading ? "#5a5a5a" : "#f4621f",
          color: "#000",
          border: "none",
          fontFamily: "'Space Mono', monospace",
          fontWeight: 700,
          fontSize: "0.65rem",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          padding: "0.6rem 1.2rem",
          cursor: loading ? "not-allowed" : "pointer",
          transition: "opacity 0.15s",
        }}
      >
        {loading ? "Redirecting…" : `Pay $${(priceCents / 100).toFixed(2)} →`}
      </button>
      {error && (
        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.58rem", color: "#ff5555" }}>
          {error}
        </span>
      )}
    </div>
  );
}

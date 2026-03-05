"use client";
import { useState } from "react";

export default function SettingsForm({ profile, email }: { profile: any; email: string }) {
  const [name, setName] = useState(profile?.name ?? "");
  const [company, setCompany] = useState(profile?.company ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function save() {
    setSaving(true); setMsg(null);
    const res = await fetch("/api/dashboard/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, company, phone }),
    });
    const data = await res.json();
    setMsg(res.ok ? "✓ Saved" : data.error);
    setSaving(false);
  }

  const inputStyle = {
    background: "#131313", border: "1px solid #282828", color: "#efefef",
    padding: "0.72rem 0.9rem", fontFamily: "'DM Sans', sans-serif",
    fontSize: "0.9rem", outline: "none", width: "100%",
  };
  const labelStyle = {
    fontFamily: "'Space Mono', monospace", fontSize: "0.62rem",
    letterSpacing: "0.14em", color: "#5a5a5a", textTransform: "uppercase" as const,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
        <label style={labelStyle}>Email</label>
        <input style={{ ...inputStyle, opacity: 0.5 }} value={email} disabled />
      </div>
      {[
        { label: "Full Name", val: name, set: setName },
        { label: "Company", val: company, set: setCompany },
        { label: "Phone", val: phone, set: setPhone },
      ].map(({ label, val, set }) => (
        <div key={label} style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
          <label style={labelStyle}>{label}</label>
          <input style={inputStyle} value={val} onChange={(e) => set(e.target.value)} />
        </div>
      ))}
      <button
        disabled={saving}
        onClick={save}
        style={{ background: "#f4621f", border: "none", color: "#000", fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: "0.85rem", letterSpacing: "0.05em", textTransform: "uppercase", padding: "0.85rem 2rem", cursor: "pointer", opacity: saving ? 0.5 : 1, alignSelf: "flex-start" }}
      >
        {saving ? "Saving…" : "Save Changes"}
      </button>
      {msg && <p style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.78rem", color: msg.startsWith("✓") ? "#6abf69" : "#ff5555" }}>{msg}</p>}
    </div>
  );
}
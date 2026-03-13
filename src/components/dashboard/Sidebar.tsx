"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/dashboard",          label: "Overview",  icon: "⊞" },
  { href: "/dashboard/quotes",   label: "My Quotes",  icon: "◈" },
  { href: "/dashboard/settings", label: "Settings",  icon: "⚙" },
];

export default function Sidebar() {
  const path = usePathname();

  return (
    <aside style={{
      width: 190,
      background: "#0d0d0d",
      borderRight: "1px solid #1e1e1e",
      padding: "1.2rem 0",
      display: "flex",
      flexDirection: "column",
      position: "sticky",
      top: 0,
      height: "100vh",
      flexShrink: 0,
    }}>
      <Link href="/" style={{
        fontFamily: "'Space Grotesk', sans-serif",
        fontWeight: 700,
        fontSize: "0.85rem",
        letterSpacing: "-0.02em",
        color: "#efefef",
        textDecoration: "none",
        padding: "0 1.2rem",
        marginBottom: "1.5rem",
        display: "block",
      }}>
        Create<span style={{ color: "#f4621f" }}>3D</span>Parts
      </Link>

      <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {NAV.map((n) => {
          const active =
            path === n.href ||
            (n.href !== "/dashboard" && path.startsWith(n.href));
          return (
            <Link
              key={n.href}
              href={n.href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.55rem",
                padding: "0.5rem 1.2rem",
                fontSize: "0.78rem",
                fontWeight: active ? 600 : 400,
                color: active ? "#f4621f" : "#a0a0a0",
                textDecoration: "none",
                background: active ? "rgba(244,98,31,0.07)" : "transparent",
                borderLeft: active ? "2px solid #f4621f" : "2px solid transparent",
                transition: "color 0.15s",
              }}
            >
              <span style={{ fontSize: "0.8rem", opacity: 0.8 }}>{n.icon}</span>
              {n.label}
            </Link>
          );
        })}
      </nav>

      <div style={{ marginTop: "auto", padding: "1.2rem", borderTop: "1px solid #1e1e1e" }}>
        <Link href="/" style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: "0.56rem",
          letterSpacing: "0.1em",
          color: "#5a5a5a",
          textDecoration: "none",
          textTransform: "uppercase",
        }}>
          ← Back to site
        </Link>
      </div>
    </aside>
  );
}

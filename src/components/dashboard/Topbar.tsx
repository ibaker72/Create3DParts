"use client";

import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";

export default function Topbar({ name }: { name: string }) {
  const supabase = createClient();
  const router = useRouter();

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/");
  }

  return (
    <div style={{
      height: 42,
      background: "#0d0d0d",
      borderBottom: "1px solid #1e1e1e",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 1.5rem",
      flexShrink: 0,
    }}>
      <span style={{
        fontFamily: "'Space Mono', monospace",
        fontSize: "0.65rem",
        color: "#5a5a5a",
        letterSpacing: "0.08em",
      }}>
        {name}
      </span>
      <button
        onClick={signOut}
        style={{
          background: "none",
          border: "1px solid #282828",
          color: "#5a5a5a",
          fontFamily: "'Space Mono', monospace",
          fontSize: "0.56rem",
          letterSpacing: "0.1em",
          padding: "0.28rem 0.65rem",
          cursor: "pointer",
          textTransform: "uppercase",
          transition: "color 0.15s, border-color 0.15s",
        }}
        onMouseEnter={(e) => {
          (e.target as HTMLButtonElement).style.color = "#efefef";
          (e.target as HTMLButtonElement).style.borderColor = "#5a5a5a";
        }}
        onMouseLeave={(e) => {
          (e.target as HTMLButtonElement).style.color = "#5a5a5a";
          (e.target as HTMLButtonElement).style.borderColor = "#282828";
        }}
      >
        Sign out
      </button>
    </div>
  );
}

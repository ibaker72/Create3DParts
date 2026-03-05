const BADGES: Record<string, { label: string; color: string; bg: string }> = {
  pending:    { label: "Pending Review", color: "#a0a0a0", bg: "rgba(160,160,160,0.1)" },
  priced:     { label: "Priced",        color: "#f0b429", bg: "rgba(240,180,41,0.1)"  },
  reviewing:  { label: "Reviewing",      color: "#f0b429", bg: "rgba(240,180,41,0.1)"  },
  quoted:     { label: "Quote Ready",    color: "#f4621f", bg: "rgba(244,98,31,0.1)"   },
  approved:   { label: "Approved",       color: "#6abf69", bg: "rgba(106,191,105,0.1)" },
  printing:   { label: "Printing",       color: "#4db6f0", bg: "rgba(77,182,240,0.1)"  },
  shipped:    { label: "Shipped",        color: "#4db6f0", bg: "rgba(77,182,240,0.1)"  },
  complete:   { label: "Complete",       color: "#6abf69", bg: "rgba(106,191,105,0.1)" },
  cancelled:  { label: "Cancelled",      color: "#ff5555", bg: "rgba(255,85,85,0.1)"   },
  // legacy
  sent:       { label: "Quote Sent",     color: "#f4621f", bg: "rgba(244,98,31,0.1)"   },
  paid:       { label: "Paid",           color: "#6abf69", bg: "rgba(106,191,105,0.1)" },
};

export default function StatusBadge({ status }: { status: string }) {
  const b = BADGES[status] ?? { label: status, color: "#5a5a5a", bg: "rgba(90,90,90,0.1)" };
  return (
    <span style={{
      fontFamily: "'Space Mono', monospace",
      fontSize: "0.6rem",
      letterSpacing: "0.1em",
      textTransform: "uppercase",
      color: b.color,
      background: b.bg,
      padding: "0.25rem 0.6rem",
      whiteSpace: "nowrap",
    }}>
      {b.label}
    </span>
  );
}

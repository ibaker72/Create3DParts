type Event = {
  id: string;
  status: string;
  note: string | null;
  created_at: string;
};

export default function Timeline({ events }: { events: Event[] }) {
  if (!events.length) {
    return (
      <p style={{ fontSize: "0.85rem", color: "#5a5a5a", fontStyle: "italic" }}>
        No events yet.
      </p>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {events.map((ev, i) => (
        <div key={ev.id} style={{ display: "flex", gap: "1rem", position: "relative" }}>
          {/* connector line */}
          {i < events.length - 1 && (
            <div style={{
              position: "absolute",
              left: 7,
              top: 20,
              width: 1,
              height: "100%",
              background: "#1e1e1e",
            }} />
          )}
          {/* dot */}
          <div style={{
            width: 15,
            height: 15,
            borderRadius: "50%",
            background: "#f4621f",
            flexShrink: 0,
            marginTop: 3,
            border: "2px solid #0a0a0a",
            zIndex: 1,
          }} />
          {/* content */}
          <div style={{ paddingBottom: "1.5rem", flex: 1 }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "0.8rem",
              flexWrap: "wrap",
            }}>
              <span style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontWeight: 600,
                fontSize: "0.88rem",
                textTransform: "capitalize",
              }}>
                {ev.status}
              </span>
              <span style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: "0.62rem",
                color: "#5a5a5a",
              }}>
                {new Date(ev.created_at).toLocaleString()}
              </span>
            </div>
            {ev.note && (
              <p style={{
                fontSize: "0.82rem",
                color: "#a0a0a0",
                marginTop: "0.3rem",
                lineHeight: 1.6,
              }}>
                {ev.note}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

import Link from "next/link";

export default function PendingPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0d0d0d",
        padding: "1.5rem",
      }}
    >
      <div
        style={{
          maxWidth: 420,
          width: "100%",
          background: "#111",
          border: "1px solid #1e1e1e",
          padding: "2rem 1.8rem",
          textAlign: "center",
        }}
      >
        {/* Icon */}
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            background: "#1a1400",
            border: "1px solid #3a2e00",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 1.2rem",
            fontSize: "1.2rem",
          }}
        >
          ⏳
        </div>

        <p
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: "0.55rem",
            letterSpacing: "0.2em",
            color: "#f4621f",
            textTransform: "uppercase",
            marginBottom: "0.6rem",
          }}
        >
          // Pending Approval
        </p>

        <h1
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 700,
            fontSize: "1.3rem",
            letterSpacing: "-0.03em",
            color: "#efefef",
            marginBottom: "0.8rem",
          }}
        >
          Account Under Review
        </h1>

        <p
          style={{
            fontSize: "0.82rem",
            color: "#888",
            lineHeight: 1.65,
            marginBottom: "1.5rem",
          }}
        >
          Your account is currently under review. We will send you an email with
          a login link once your account has been approved. This usually takes
          less than 24 hours.
        </p>

        <Link
          href="/"
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: "0.62rem",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "#5a5a5a",
            textDecoration: "none",
          }}
        >
          &larr; Return to home
        </Link>
      </div>
    </div>
  );
}

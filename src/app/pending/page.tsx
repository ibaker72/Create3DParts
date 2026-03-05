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
        padding: "2rem",
      }}
    >
      <div
        style={{
          maxWidth: 480,
          width: "100%",
          background: "#111",
          border: "1px solid #1e1e1e",
          padding: "3rem 2.5rem",
          textAlign: "center",
        }}
      >
        {/* Icon */}
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: "#1a1400",
            border: "1px solid #3a2e00",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 1.5rem",
            fontSize: "1.5rem",
          }}
        >
          ⏳
        </div>

        <p
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: "0.6rem",
            letterSpacing: "0.2em",
            color: "#f4621f",
            textTransform: "uppercase",
            marginBottom: "0.75rem",
          }}
        >
          // Pending Approval
        </p>

        <h1
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 700,
            fontSize: "1.6rem",
            letterSpacing: "-0.03em",
            color: "#efefef",
            marginBottom: "1rem",
          }}
        >
          Account Under Review
        </h1>

        <p
          style={{
            fontSize: "0.9rem",
            color: "#888",
            lineHeight: 1.7,
            marginBottom: "2rem",
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
            fontSize: "0.68rem",
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

// src/app/not-found.tsx
import Link from "next/link";

export default function NotFound() {
  return (
    <div style={{
      minHeight: "100vh", background: "var(--bg-base)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "var(--font-display)", color: "var(--text-primary)",
    }}>
      <div style={{ textAlign: "center", padding: "48px 32px" }}>
        <div style={{ fontSize: 80, fontWeight: 900, letterSpacing: "-0.06em", color: "var(--border-strong)", lineHeight: 1, marginBottom: 16 }}>404</div>
        <h1 style={{ margin: "0 0 12px", fontSize: 24, fontWeight: 700, letterSpacing: "-0.03em" }}>Page not found</h1>
        <p style={{ margin: "0 0 32px", color: "var(--text-muted)", fontSize: 15, maxWidth: 360 }}>
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link href="/dashboard" style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          padding: "10px 24px", background: "var(--accent)", color: "#fff",
          borderRadius: "var(--radius-md)", textDecoration: "none",
          fontSize: 14, fontWeight: 600, transition: "all var(--transition-base)",
        }}>
          ← Back to Dashboard
        </Link>
      </div>
    </div>
  );
}

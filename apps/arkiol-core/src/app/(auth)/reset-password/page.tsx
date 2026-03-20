"use client";
// src/app/(auth)/reset-password/page.tsx
import { useState, FormEvent } from "react";

export default function ResetPasswordPage() {
  const [email,   setEmail]   = useState("");
  const [sent,    setSent]    = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    const res  = await fetch("/api/auth/reset-password", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setError(data.error ?? "Request failed"); setLoading(false); return; }
    setSent(true);
  }

  return (
    <div style={{
      minHeight: "100vh", background: "var(--bg-base)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "24px", fontFamily: "var(--font-body)",
    }}>
      <div className="ak-fade-in" style={{
        width: "100%", maxWidth: 380, padding: "44px 40px",
        background: "var(--bg-surface)", border: "1px solid var(--border-strong)",
        borderRadius: "var(--radius-2xl)", boxShadow: "var(--shadow-xl)",
        position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1.5, background: "linear-gradient(90deg, var(--accent), #c084fc)" }} />

        <div style={{ marginBottom: 28, textAlign: "center" }}>
          <div style={{
            width: 44, height: 44, borderRadius: "var(--radius-md)", margin: "0 auto 14px",
            background: "linear-gradient(145deg, var(--accent) 0%, #9b5de5 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, fontWeight: 800, color: "#fff", fontFamily: "var(--font-display)",
          }}>A</div>
          <h1 style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.03em", margin: 0, fontFamily: "var(--font-display)" }}>
            {sent ? "Check your email" : "Reset your Arkiol password"}
          </h1>
          <p style={{ color: "var(--text-muted)", margin: "6px 0 0", fontSize: 13 }}>
            {sent
              ? `We sent a reset link to ${email}`
              : "Enter your email and we'll send a reset link"}
          </p>
        </div>

        {!sent ? (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="ak-form-group">
              <label className="ak-form-label">Email address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="ak-input" placeholder="you@company.com" required autoFocus />
            </div>
            {error && <div className="ak-toast ak-toast-error"><span>⚠</span><span>{error}</span></div>}
            <button type="submit" disabled={loading || !email} className="ak-btn ak-btn-primary"
              style={{ width: "100%", padding: "11px" }}>
              {loading ? "Sending…" : "Send reset link"}
            </button>
          </form>
        ) : (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📬</div>
            <p style={{ color: "var(--text-secondary)", fontSize: 13.5 }}>
              Didn't get it? Check your spam folder or{" "}
              <button onClick={() => setSent(false)} style={{ background: "none", border: "none", color: "var(--accent-light)", cursor: "pointer", padding: 0, fontSize: 13.5 }}>
                try again
              </button>.
            </p>
          </div>
        )}

        <p style={{ textAlign: "center", fontSize: 12.5, color: "var(--text-muted)", marginTop: 24, marginBottom: 0 }}>
          <a href="/login" style={{ color: "var(--accent-light)" }}>← Back to sign in</a>
        </p>
      </div>
    </div>
  );
}

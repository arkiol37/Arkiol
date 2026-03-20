"use client";
// src/app/(auth)/set-password/page.tsx
import { useState, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function SetPasswordForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const token        = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [error,    setError]    = useState<string | null>(null);
  const [loading,  setLoading]  = useState(false);
  const [done,     setDone]     = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setError("Passwords do not match"); return; }
    if (password.length < 8)  { setError("Password must be at least 8 characters"); return; }
    setLoading(true); setError(null);

    const res  = await fetch("/api/auth/set-password", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setError(data.error ?? "Failed to set password"); setLoading(false); return; }
    setDone(true);
    setTimeout(() => router.push("/login"), 2000);
  }

  if (!token) {
    return (
      <div style={{ textAlign: "center", padding: "48px 24px" }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>🔗</div>
        <p style={{ color: "var(--text-muted)" }}>Invalid or expired reset link. <a href="/reset-password" style={{ color: "var(--accent-light)" }}>Request a new one</a>.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {done ? (
        <div className="ak-toast ak-toast-success"><span>✓</span><span>Password updated — redirecting…</span></div>
      ) : (
        <>
          <div className="ak-form-group">
            <label className="ak-form-label">New password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              className="ak-input" placeholder="Min. 8 characters" required autoFocus />
          </div>
          <div className="ak-form-group">
            <label className="ak-form-label">Confirm password</label>
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
              className="ak-input" placeholder="Repeat password" required />
          </div>
          {error && <div className="ak-toast ak-toast-error"><span>⚠</span><span>{error}</span></div>}
          <button type="submit" disabled={loading || !password} className="ak-btn ak-btn-primary"
            style={{ width: "100%", padding: "11px" }}>
            {loading ? "Saving…" : "Set new password"}
          </button>
        </>
      )}
    </form>
  );
}

export default function SetPasswordPage() {
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
          <h1 style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.03em", margin: 0, fontFamily: "var(--font-display)" }}>Set new password</h1>
          <p style={{ color: "var(--text-muted)", margin: "6px 0 0", fontSize: 13 }}>Choose a strong password for your Arkiol account</p>
        </div>
        <Suspense fallback={<div style={{ color: "var(--text-muted)", textAlign: "center" }}>Loading…</div>}>
          <SetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}

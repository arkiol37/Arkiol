"use client";
// src/app/(auth)/register/page.tsx
import { useState, FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [name,     setName]     = useState("");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [error,    setError]    = useState<string | null>(null);
  const [loading,  setLoading]  = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setError("Passwords do not match"); return; }
    if (password.length < 8)  { setError("Password must be at least 8 characters"); return; }
    setLoading(true); setError(null);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) { setError(data.error ?? "Registration failed"); setLoading(false); return; }

    const result = await signIn("credentials", { email, password, redirect: false });
    if (result?.error) { setError("Account created but sign-in failed. Please log in."); setLoading(false); return; }
    router.push("/dashboard");
  }

  async function handleGoogle() {
    setLoading(true);
    await signIn("google", { callbackUrl: "/dashboard" });
  }

  return (
    <div style={{
      minHeight: "100vh", background: "var(--bg-base)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "24px", fontFamily: "var(--font-body)", position: "relative", overflow: "hidden",
    }}>
      <div className="ak-glow-blob" style={{ width: 600, height: 600, top: -200, right: -150, background: "#c084fc", opacity: 0.06 }} />
      <div className="ak-glow-blob" style={{ width: 500, height: 500, bottom: -100, left: -120, background: "var(--accent)", opacity: 0.055 }} />
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        backgroundImage: "linear-gradient(rgba(255,255,255,0.012) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.012) 1px, transparent 1px)",
        backgroundSize: "44px 44px",
      }} />

      <div className="ak-fade-in" style={{
        width: "100%", maxWidth: 420, padding: "44px 40px",
        background: "var(--bg-surface)", border: "1px solid var(--border-strong)",
        borderRadius: "var(--radius-2xl)", boxShadow: "var(--shadow-xl), 0 0 0 1px rgba(124,127,250,0.06)",
        position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1.5, background: "linear-gradient(90deg, var(--accent), #c084fc, var(--tertiary))" }} />

        <div style={{ marginBottom: 32, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 48, height: 48, borderRadius: "var(--radius-md)",
            background: "linear-gradient(145deg, var(--accent) 0%, #9b5de5 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 20, fontWeight: 800, color: "#fff", fontFamily: "var(--font-display)",
            boxShadow: "var(--shadow-accent)",
          }}>A</div>
          <div style={{ textAlign: "center" }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.04em", margin: 0, fontFamily: "var(--font-display)" }}>Create your Arkiol account</h1>
            <p style={{ color: "var(--text-muted)", margin: "4px 0 0", fontSize: 13 }}>Start your 14-day free trial</p>
          </div>
        </div>

        <button onClick={handleGoogle} disabled={loading} style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
          padding: "10px 16px", background: "var(--bg-elevated)", border: "1px solid var(--border-strong)",
          borderRadius: "var(--radius-md)", color: "var(--text-primary)", fontSize: 13.5, fontWeight: 500,
          cursor: "pointer", marginBottom: 20, transition: "all var(--transition-base)", fontFamily: "var(--font-body)",
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          Continue with Google
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
          <span style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>or</span>
          <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="ak-form-group">
            <label className="ak-form-label">Full name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} className="ak-input" placeholder="Jane Smith" required autoFocus />
          </div>
          <div className="ak-form-group">
            <label className="ak-form-label">Work email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="ak-input" placeholder="you@company.com" required />
          </div>
          <div className="ak-form-group">
            <label className="ak-form-label">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="ak-input" placeholder="Min. 8 characters" required />
          </div>
          <div className="ak-form-group">
            <label className="ak-form-label">Confirm password</label>
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} className="ak-input" placeholder="Repeat password" required />
          </div>

          {error && (
            <div className="ak-toast ak-toast-error" style={{ fontSize: 12.5 }}>
              <span>⚠</span><span>{error}</span>
            </div>
          )}

          <button type="submit" disabled={loading || !name || !email || !password} className="ak-btn ak-btn-primary"
            style={{ width: "100%", marginTop: 4, padding: "11px", fontSize: 14 }}>
            {loading ? "Creating account…" : "Create free account"}
          </button>
        </form>

        <p style={{ textAlign: "center", fontSize: 11.5, color: "var(--text-muted)", marginTop: 20, lineHeight: 1.6 }}>
          By creating an account you agree to our{" "}
          <a href="/terms" style={{ color: "var(--accent-light)" }}>Terms</a> and{" "}
          <a href="/privacy" style={{ color: "var(--accent-light)" }}>Privacy Policy</a>.
        </p>

        <p style={{ textAlign: "center", fontSize: 12.5, color: "var(--text-muted)", marginTop: 16, marginBottom: 0 }}>
          Already have an account?{" "}
          <a href="/login" style={{ color: "var(--accent-light)" }}>Sign in</a>
        </p>
      </div>
    </div>
  );
}

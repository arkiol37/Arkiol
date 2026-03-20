"use client";
// src/app/(auth)/login/page.tsx
import React, { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const result = await signIn("credentials", {
        email, password, redirect: false,
      });
      if (result?.error) {
        setError("Invalid email or password");
      } else {
        router.push("/dashboard");
      }
    } catch {
      setError("Authentication service unavailable. Please configure NEXTAUTH_SECRET.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0a0f" }}>
      <div style={{ width: 400, padding: 40, background: "#111118", borderRadius: 16, border: "1px solid #1e1e2e" }}>
        <h1 style={{ color: "#fff", fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Sign in to Arkiol</h1>
        <p style={{ color: "#666", marginBottom: 32, fontSize: 14 }}>AI-Powered Design Platform</p>

        {error?.includes('unavailable') && (
          <div style={{ background: "#2a1a00", border: "1px solid #ff8800", borderRadius: 8, padding: 12, marginBottom: 20, fontSize: 13, color: "#ffaa44" }}>
            ⚠️ Authentication not configured. Add NEXTAUTH_SECRET and DATABASE_URL to enable login.
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", color: "#aaa", fontSize: 13, marginBottom: 6 }}>Email</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)} required
              style={{ width: "100%", padding: "10px 14px", background: "#1a1a26", border: "1px solid #2a2a3e", borderRadius: 8, color: "#fff", fontSize: 14, boxSizing: "border-box" }}
            />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: "block", color: "#aaa", fontSize: 13, marginBottom: 6 }}>Password</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)} required
              style={{ width: "100%", padding: "10px 14px", background: "#1a1a26", border: "1px solid #2a2a3e", borderRadius: 8, color: "#fff", fontSize: 14, boxSizing: "border-box" }}
            />
          </div>
          {error && <p style={{ color: "#ff4466", fontSize: 13, marginBottom: 16 }}>{error}</p>}
          <button
            type="submit" disabled={loading}
            style={{ width: "100%", padding: "12px", background: loading ? "#333" : "#6c47ff", color: "#fff", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer" }}
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
        <p style={{ color: "#555", fontSize: 13, textAlign: "center", marginTop: 24 }}>
          Don&apos;t have an account? <a href="/register" style={{ color: "#6c47ff" }}>Register</a>
        </p>
      </div>
    </div>
  );
}

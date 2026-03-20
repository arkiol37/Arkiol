"use client";
// src/app/error.tsx — Resilient error boundary
import { useEffect } from "react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("App error:", error); }, [error]);

  const isServiceError = error.message?.includes('not configured') ||
    error.message?.includes('DATABASE_URL') ||
    error.message?.includes('unavailable');

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0a0f", padding: 24 }}>
      <div style={{ maxWidth: 520, textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>{isServiceError ? "⚠️" : "❌"}</div>
        <h2 style={{ color: "#fff", fontSize: 24, fontWeight: 700, marginBottom: 12 }}>
          {isServiceError ? "Service Not Available" : "Something went wrong"}
        </h2>
        <p style={{ color: "#888", fontSize: 15, marginBottom: 8, lineHeight: 1.6 }}>
          {isServiceError
            ? error.message
            : "An unexpected error occurred. Please try again."}
        </p>
        {error.digest && (
          <p style={{ color: "#555", fontSize: 12, marginBottom: 24 }}>Error ID: {error.digest}</p>
        )}
        {isServiceError ? (
          <p style={{ color: "#666", fontSize: 13, background: "#111", padding: "12px 16px", borderRadius: 8, border: "1px solid #222" }}>
            Add the required environment variables in your Vercel project settings, then redeploy.
          </p>
        ) : (
          <button
            onClick={reset}
            style={{ marginTop: 24, padding: "10px 24px", background: "#6c47ff", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, cursor: "pointer" }}
          >
            Try again
          </button>
        )}
      </div>
    </div>
  );
}

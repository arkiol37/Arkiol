"use client";
// src/app/(auth)/error/page.tsx
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";

const ERROR_MESSAGES: Record<string, string> = {
  Configuration:          "Server configuration error. Please contact support.",
  AccessDenied:           "Access denied. Your account may not have permission to sign in.",
  Verification:           "The sign-in link has expired or is invalid.",
  OAuthSignin:            "Could not sign in with OAuth provider. Try again.",
  OAuthCallback:          "OAuth callback error. Try signing in again.",
  OAuthCreateAccount:     "Could not create account with this OAuth provider.",
  EmailCreateAccount:     "Could not create account with this email.",
  Callback:               "Sign-in callback error.",
  OAuthAccountNotLinked:  "This email is already linked to another sign-in method.",
  SessionRequired:        "You must be signed in to access this page.",
  Default:                "An authentication error occurred.",
};

function AuthErrorContent() {
  const params  = useSearchParams();
  const error   = params.get("error") ?? "Default";
  const message = ERROR_MESSAGES[error] ?? ERROR_MESSAGES.Default;

  return (
    <div style={{
      maxWidth: 400,
      padding: "48px 40px",
      background: "#0f1117",
      border: "1px solid rgba(239,68,68,0.2)",
      borderRadius: 16,
      textAlign: "center",
    }}>
      <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
      <h1 style={{ color: "#f9fafb", fontSize: 20, fontWeight: 700, marginBottom: 12 }}>
        Authentication Error
      </h1>
      <p style={{ color: "#9ca3af", fontSize: 14, marginBottom: 32 }}>
        {message}
      </p>
      <Link
        href="/login"
        style={{
          display: "inline-block",
          padding: "10px 24px",
          background: "#4f6ef7",
          color: "#fff",
          borderRadius: 8,
          textDecoration: "none",
          fontSize: 14,
          fontWeight: 600,
        }}
      >
        Back to Login
      </Link>
      <p style={{ marginTop: 16, fontSize: 12, color: "#6b7280" }}>
        Error code: {error}
      </p>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <div style={{
      minHeight: "100vh",
      background: "#070810",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "var(--font-display)",
    }}>
      <Suspense fallback={
        <div style={{ color: "#9ca3af", textAlign: "center", padding: 40 }}>Loading…</div>
      }>
        <AuthErrorContent />
      </Suspense>
    </div>
  );
}

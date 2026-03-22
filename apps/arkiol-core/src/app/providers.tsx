'use client';
// src/app/providers.tsx
// SessionProvider loaded client-only (ssr:false) to prevent useState crash during
// Next.js static page generation. next-auth/react uses useState internally and
// cannot be rendered in a null React context during SSR prerendering.
import dynamic from 'next/dynamic';
import React from 'react';

// Load SessionProvider only in the browser — never during SSR/prerendering
const NextAuthSessionProvider = dynamic(
  () => import('next-auth/react').then((mod) => mod.SessionProvider),
  { ssr: false }
);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  return <NextAuthSessionProvider>{children}</NextAuthSessionProvider>;
}

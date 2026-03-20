// src/app/api/auth/[...nextauth]/route.ts
// Safe NextAuth route — returns 503 when auth not configured.
import { detectCapabilities } from '@arkiol/shared';
import { NextResponse } from 'next/server';

const authConfigured = detectCapabilities().auth;
const dbConfigured   = detectCapabilities().database;

function notConfigured() {
  return NextResponse.json(
    { error: 'Authentication not configured', message: 'Set NEXTAUTH_SECRET, NEXTAUTH_URL and DATABASE_URL to enable authentication.' },
    { status: 503 }
  );
}

export async function GET(req: Request, ctx: any) {
  if (!authConfigured || !dbConfigured) return notConfigured();
  try {
    const { authOptions } = await import('../../../../lib/auth');
    const NextAuth        = (await import('next-auth')).default;
    return NextAuth(authOptions)(req, ctx);
  } catch {
    return notConfigured();
  }
}

export async function POST(req: Request, ctx: any) {
  if (!authConfigured || !dbConfigured) return notConfigured();
  try {
    const { authOptions } = await import('../../../../lib/auth');
    const NextAuth        = (await import('next-auth')).default;
    return NextAuth(authOptions)(req, ctx);
  } catch {
    return notConfigured();
  }
}

// src/app/api/auth/[...nextauth]/route.ts
// Safe NextAuth route — returns 503 when auth not configured.
import { NextResponse } from 'next/server';

function notConfigured() {
  return NextResponse.json(
    { error: 'Authentication not configured', message: 'Set NEXTAUTH_SECRET, NEXTAUTH_URL and DATABASE_URL to enable authentication.' },
    { status: 503 }
  );
}

function isAuthConfigured(): boolean {
  return !!(
    process.env.NEXTAUTH_SECRET &&
    process.env.NEXTAUTH_SECRET.length >= 32 &&
    process.env.DATABASE_URL &&
    (process.env.DATABASE_URL.startsWith('postgresql://') || process.env.DATABASE_URL.startsWith('postgres://'))
  );
}

export async function GET(req: Request, ctx: any) {
  if (!isAuthConfigured()) return notConfigured();
  try {
    const { authOptions } = await import('../../../../lib/auth');
    const NextAuth        = (await import('next-auth')).default;
    return NextAuth(authOptions)(req, ctx);
  } catch (err: any) {
    console.error('[nextauth] GET error:', err?.message);
    return notConfigured();
  }
}

export async function POST(req: Request, ctx: any) {
  if (!isAuthConfigured()) return notConfigured();
  try {
    const { authOptions } = await import('../../../../lib/auth');
    const NextAuth        = (await import('next-auth')).default;
    return NextAuth(authOptions)(req, ctx);
  } catch (err: any) {
    console.error('[nextauth] POST error:', err?.message);
    return notConfigured();
  }
}

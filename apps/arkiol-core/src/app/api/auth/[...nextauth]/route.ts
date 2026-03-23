// src/app/api/auth/[...nextauth]/route.ts
// NextAuth v4 handler — App Router compatible.
// Returns 503 only when auth env vars are genuinely absent.
// All other errors return 500 with a log so they're visible in Vercel function logs.
import { detectCapabilities } from '@arkiol/shared';
import { NextResponse } from 'next/server';

function notConfigured() {
  return NextResponse.json(
    { error: 'Authentication not configured', message: 'Set NEXTAUTH_SECRET, NEXTAUTH_URL and DATABASE_URL to enable authentication.' },
    { status: 503 }
  );
}

async function handler(req: Request, ctx: any) {
  const caps = detectCapabilities();
  if (!caps.auth || !caps.database) {
    return notConfigured();
  }
  try {
    const { authOptions } = await import('../../../../lib/auth');
    const NextAuth        = (await import('next-auth')).default;
    // next-auth v4 App Router: NextAuth returns a handler fn, call with (req, ctx)
    return NextAuth(authOptions)(req, ctx);
  } catch (err: any) {
    console.error('[auth/nextauth] handler error:', err?.message ?? err);
    return NextResponse.json(
      { error: 'Authentication error', message: err?.message ?? 'Internal server error' },
      { status: 500 }
    );
  }
}

export { handler as GET, handler as POST };

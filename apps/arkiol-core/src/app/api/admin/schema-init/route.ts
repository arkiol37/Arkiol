// src/app/api/admin/schema-init/route.ts
// Runs prisma migrate deploy on demand. Requires BOOTSTRAP_SECRET.
// Use after first deploying to Vercel when the DB has no tables yet.
//
// Usage:
//   curl -X POST https://arkiol1.vercel.app/api/admin/schema-init \
//     -H "Content-Type: application/json" \
//     -d '{"secret":"<BOOTSTRAP_SECRET>"}'
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const bootstrapSecret = process.env.BOOTSTRAP_SECRET ?? '';
  if (bootstrapSecret.length < 32) {
    return NextResponse.json(
      { error: 'BOOTSTRAP_SECRET not configured (min 32 chars).' },
      { status: 403 }
    );
  }

  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { timingSafeEqual } = await import('crypto');
  const secretBuf   = Buffer.from(body?.secret ?? '');
  const expectedBuf = Buffer.from(bootstrapSecret);
  if (
    secretBuf.length !== expectedBuf.length ||
    !timingSafeEqual(secretBuf, expectedBuf)
  ) {
    return NextResponse.json({ error: 'Invalid secret.' }, { status: 403 });
  }

  const results: string[] = [];

  // Run migrate deploy
  try {
    const { execSync } = await import('child_process');
    const out = execSync(
      'npx prisma migrate deploy --schema=../../packages/shared/prisma/schema.prisma',
      {
        cwd: process.cwd(),
        timeout: 55_000,
        encoding: 'utf8',
        env: { ...process.env },
      }
    );
    results.push('✓ migrate deploy: ' + (out?.trim()?.slice(0, 400) || 'ok'));
  } catch (err: any) {
    results.push('migrate deploy: ' + (err?.message ?? String(err)).slice(0, 500));
  }

  // Verify User table
  try {
    const { prisma } = await import('../../../../lib/prisma');
    const rows: any[] = await (prisma as any).$queryRaw`SELECT COUNT(*)::int as n FROM "User"`;
    results.push(`✓ User table: ${rows[0]?.n ?? 0} rows`);
  } catch (err: any) {
    results.push('✗ User table error: ' + err?.message?.slice(0, 200));
  }

  // Verify Org table
  try {
    const { prisma } = await import('../../../../lib/prisma');
    const rows: any[] = await (prisma as any).$queryRaw`SELECT COUNT(*)::int as n FROM "Org"`;
    results.push(`✓ Org table: ${rows[0]?.n ?? 0} rows`);
  } catch (err: any) {
    results.push('✗ Org table error: ' + err?.message?.slice(0, 200));
  }

  return NextResponse.json({ ok: true, results, timestamp: new Date().toISOString() });
}

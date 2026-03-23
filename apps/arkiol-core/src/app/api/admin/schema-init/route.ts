// src/app/api/admin/schema-init/route.ts
// Admin endpoint to verify database connectivity and table presence.
//
// NOTE: `prisma migrate deploy` CANNOT run on Vercel serverless — there is no
// Prisma CLI binary on the Lambda filesystem and it is read-only. Migrations
// must be run from a local machine or CI:
//   npx prisma migrate deploy --schema=packages/shared/prisma/schema.prisma
//
// This endpoint now serves as a DB health/status check instead.
// Requires BOOTSTRAP_SECRET (min 32 chars) in env.
import { NextRequest, NextResponse } from 'next/server';

export const dynamic     = 'force-dynamic';
export const maxDuration = 10; // Vercel Hobby plan maximum

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

  // Verify DB connectivity via Prisma model (uses @@map snake_case table names)
  try {
    const { prisma } = await import('../../../../lib/prisma');
    const userCount = await prisma.user.count();
    results.push(`✓ user table: ${userCount} rows`);
  } catch (err: any) {
    results.push('✗ user table error: ' + err?.message?.slice(0, 200));
  }

  try {
    const { prisma } = await import('../../../../lib/prisma');
    const orgCount = await prisma.org.count();
    results.push(`✓ org table: ${orgCount} rows`);
  } catch (err: any) {
    results.push('✗ org table error: ' + err?.message?.slice(0, 200));
  }

  results.push(
    'ℹ️  To run migrations: npx prisma migrate deploy --schema=packages/shared/prisma/schema.prisma'
  );

  return NextResponse.json({ ok: true, results, timestamp: new Date().toISOString() });
}

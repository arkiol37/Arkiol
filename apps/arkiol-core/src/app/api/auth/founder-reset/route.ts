// src/app/api/auth/founder-reset/route.ts
// Emergency founder password reset — no email token required.
// Validates the request by matching FOUNDER_EMAIL env var server-side.
// Only works when FOUNDER_EMAIL is set in environment variables.
import { NextRequest, NextResponse } from 'next/server';
import { detectCapabilities } from '@arkiol/shared';
import { prisma } from '../../../../lib/prisma';
import { hashPassword, validatePasswordStrength } from '../../../../lib/auth';
import { z } from 'zod';

const Schema = z.object({
  email:       z.string().email(),
  newPassword: z.string().min(8).max(128),
  resetKey:    z.string().min(8), // FOUNDER_RESET_KEY env var — mandatory
});

export async function POST(req: NextRequest) {
  if (!detectCapabilities().database) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const founderEmail = process.env.FOUNDER_EMAIL?.toLowerCase().trim();
  if (!founderEmail) {
    return NextResponse.json({ error: 'Founder email not configured' }, { status: 403 });
  }

  let body: any;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Invalid request' }, { status: 400 });
  }

  const { email, newPassword, resetKey } = parsed.data;

  if (email.toLowerCase().trim() !== founderEmail) {
    return NextResponse.json({ error: 'Email does not match founder account' }, { status: 403 });
  }

  // FOUNDER_RESET_KEY is REQUIRED — this endpoint is always protected.
  // Set it in Vercel env vars before use, then remove or rotate after.
  const configuredKey = process.env.FOUNDER_RESET_KEY?.trim();
  if (!configuredKey) {
    return NextResponse.json(
      { error: 'FOUNDER_RESET_KEY environment variable not set. Configure it in Vercel before using this endpoint.' },
      { status: 403 }
    );
  }
  if (resetKey !== configuredKey) {
    console.warn('[auth] founder-reset: invalid reset key attempt for email:', email);
    return NextResponse.json({ error: 'Invalid reset key' }, { status: 403 });
  }

  const pwError = validatePasswordStrength(newPassword);
  if (pwError) {
    return NextResponse.json({ error: pwError }, { status: 400 });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email: founderEmail } });
    if (!user) {
      return NextResponse.json({ error: 'Founder account not found. Please register first.' }, { status: 404 });
    }

    const newHash = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash, role: 'SUPER_ADMIN' },
    });

    if (user.orgId) {
      await prisma.org.update({
        where: { id: user.orgId },
        data: { plan: 'STUDIO', subscriptionStatus: 'ACTIVE', creditBalance: 999_999, dailyCreditBalance: 9_999 },
      }).catch(() => {});
    }

    console.info('[auth] founder-reset: password updated for', user.id);
    return NextResponse.json({ success: true, message: 'Founder password updated. You can now log in.' });
  } catch (err: any) {
    console.error('[auth] founder-reset error:', err?.message ?? err);
    return NextResponse.json({ error: 'Database error: ' + (err?.message ?? 'Unknown') }, { status: 500 });
  }
}

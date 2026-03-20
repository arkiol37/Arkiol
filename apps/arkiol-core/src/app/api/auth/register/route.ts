// src/app/api/auth/register/route.ts
import { NextRequest, NextResponse } from "next/server";
import { detectCapabilities } from '@arkiol/shared';
import { prisma }            from "../../../../lib/prisma";
import { hashPassword, validatePasswordStrength } from "../../../../lib/auth";
import { withErrorHandling, dbUnavailable } from "../../../../lib/error-handling";
import { rateLimit }         from "../../../../lib/rate-limit";
import { ApiError }          from "../../../../lib/types";
import { z }                 from "zod";

const RegisterSchema = z.object({
  email:    z.string().email("Invalid email address"),
  password: z.string().min(8).max(128),
  name:     z.string().min(1).max(100).optional(),
  orgName:  z.string().min(2).max(100).optional(), // Creates a new org if provided
  inviteToken: z.string().optional(),              // Join existing org
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  if (!detectCapabilities().database) return dbUnavailable();

  // Rate limit registration strictly
  const ip  = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "unknown";
  const rl  = await rateLimit(ip, "auth");
  if (!rl.success) {
    return NextResponse.json(
      { error: "Too many registration attempts. Please wait 15 minutes." },
      { status: 429 }
    );
  }

  const body   = await req.json().catch(() => ({}));
  const parsed = RegisterSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid registration data", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { email, password, name, orgName, inviteToken } = parsed.data;

  // Validate password strength
  const pwError = validatePasswordStrength(password);
  if (pwError) return NextResponse.json({ error: pwError }, { status: 400 });

  // Check if email already exists
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    // Return same message to prevent email enumeration
    return NextResponse.json(
      { error: "An account with this email already exists" },
      { status: 409 }
    );
  }

  const passwordHash = await hashPassword(password);

  // ── Case 1: Creating a new organization ──────────────────────────────────
  if (orgName && !inviteToken) {
    const slug = orgName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 50);

    // Ensure slug is unique
    const slugExists = await prisma.org.findUnique({ where: { slug } });
    const finalSlug  = slugExists ? `${slug}-${Date.now()}` : slug;

    const [org, user] = await prisma.$transaction(async (tx) => {
      const newOrg = await tx.org.create({
        data: { name: orgName, slug: finalSlug, plan: "FREE", creditLimit: 0 },
      });
      const newUser = await tx.user.create({
        data: { email, name: name ?? null, passwordHash, orgId: newOrg.id, role: "ADMIN" },
      });
      return [newOrg, newUser];
    });

    return NextResponse.json({
      success: true,
      user:    { id: user.id, email: user.email, name: user.name, role: user.role },
      org:     { id: org.id, name: org.name, plan: org.plan },
      message: "Account created. Please sign in.",
    }, { status: 201 });
  }

  // ── Case 2: No org — standalone user (can join later) ────────────────────
  const user = await prisma.user.create({
    data: { email, name: name ?? null, passwordHash, role: "DESIGNER" },
  });

  return NextResponse.json({
    success: true,
    user:    { id: user.id, email: user.email, name: user.name, role: user.role },
    message: "Account created. Please sign in.",
  }, { status: 201 });
});

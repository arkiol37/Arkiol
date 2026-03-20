// src/lib/auth.ts
// Safe auth — works without NEXTAUTH_SECRET/DATABASE_URL configured.
// When auth is not configured, getServerSession returns null and routes
// respond with 503 "Authentication not configured" instead of crashing.
import 'server-only';
import { type NextRequest } from 'next/server';
import { ApiError }         from './types';
import { detectCapabilities } from '@arkiol/shared';

// ── Types ──────────────────────────────────────────────────────────────────────
export type NextAuthOptions = any;

// ── NextAuth options (lazy — only built when auth is configured) ───────────────
let _authOptions: any = null;

function buildAuthOptions(): any {
  const env = process.env;
  const { NextAuthOptions: _unused, ...nextAuth } = require('next-auth') as any;
  const GoogleProvider     = require('next-auth/providers/google').default;
  const AppleProvider      = require('next-auth/providers/apple').default;
  const CredentialsProvider = require('next-auth/providers/credentials').default;
  const { PrismaAdapter }  = require('@auth/prisma-adapter/index');
  const { compare }        = require('bcryptjs');
  const { z }              = require('zod');
  const { prisma }         = require('./prisma');

  function getApplePrivateKey(): string {
    const raw = env.APPLE_PRIVATE_KEY ?? '';
    if (!raw) return '';
    if (raw.includes('-----BEGIN')) return raw;
    try { return Buffer.from(raw, 'base64').toString('utf8'); } catch { return raw; }
  }

  const providers: any[] = [];

  if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
    providers.push(GoogleProvider({
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      authorization: { params: { prompt: 'consent', access_type: 'offline', response_type: 'code' } },
    }));
  }

  if (env.APPLE_ID && env.APPLE_TEAM_ID && env.APPLE_KEY_ID) {
    providers.push(AppleProvider({
      clientId: env.APPLE_ID,
      clientSecret: { appleId: env.APPLE_ID, teamId: env.APPLE_TEAM_ID, privateKey: getApplePrivateKey(), keyId: env.APPLE_KEY_ID },
    }));
  }

  const LoginSchema = z.object({ email: z.string().email(), password: z.string().min(8) });

  providers.push(CredentialsProvider({
    name: 'credentials',
    credentials: { email: { label: 'Email', type: 'email' }, password: { label: 'Password', type: 'password' } },
    async authorize(credentials: any) {
      const parsed = LoginSchema.safeParse(credentials);
      if (!parsed.success) return null;
      try {
        const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
        if (!user?.passwordHash) return null;
        const valid = await compare(parsed.data.password, user.passwordHash);
        if (!valid) return null;
        return { id: user.id, email: user.email, name: user.name, role: user.role, orgId: user.orgId };
      } catch { return null; }
    },
  }));

  return {
    adapter:  PrismaAdapter(prisma) as any,
    session:  { strategy: 'jwt', maxAge: 7 * 24 * 60 * 60 },
    providers,
    secret:   env.NEXTAUTH_SECRET,
    callbacks: {
      async jwt({ token, user }: any) {
        if (user) { token.role = (user as any).role; token.id = user.id; token.orgId = (user as any).orgId; }
        else if (token.id) {
          try {
            const dbUser = await prisma.user.findUnique({ where: { id: token.id as string }, select: { role: true, orgId: true } }).catch(() => null);
            if (dbUser) { token.role = dbUser.role; token.orgId = dbUser.orgId; }
          } catch {}
        }
        return token;
      },
      async session({ session, token }: any) {
        if (session.user) { (session.user as any).role = token.role; (session.user as any).id = token.id; (session.user as any).orgId = token.orgId; }
        return session;
      },
      async signIn({ user, account, profile }: any) {
        if (account?.provider === 'apple' && profile?.name && user.id) {
          try {
            const ap = profile as any;
            const fullName = [ap.name?.firstName, ap.name?.lastName].filter(Boolean).join(' ');
            if (fullName && !user.name) await prisma.user.update({ where: { id: user.id }, data: { name: fullName } }).catch(() => {});
          } catch {}
        }
        return true;
      },
    },
    pages:  { signIn: '/login', error: '/error' },
    events: {
      async signIn({ user, account }: any) {
        console.info(`[auth] sign_in user=${user.id} provider=${account?.provider ?? 'credentials'}`);
      },
    },
  };
}

export const authOptions: any = new Proxy({} as any, {
  get(_target, prop) {
    if (!detectCapabilities().auth) return undefined;
    if (!_authOptions) _authOptions = buildAuthOptions();
    return (_authOptions as any)[prop];
  },
});

// ── RBAC ───────────────────────────────────────────────────────────────────────
export const PERMISSIONS = {
  GENERATE_ASSETS:  ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'DESIGNER'],
  CREATE_CAMPAIGN:  ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
  PUBLISH_CAMPAIGN: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
  DELETE_CAMPAIGN:  ['SUPER_ADMIN', 'ADMIN'],
  EDIT_BRAND:       ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
  MANAGE_TEAM:      ['SUPER_ADMIN', 'ADMIN'],
  MANAGE_BILLING:   ['SUPER_ADMIN', 'ADMIN'],
  VIEW_DIAGNOSTICS: ['SUPER_ADMIN', 'ADMIN'],
  MANAGE_API_KEYS:  ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
  VIEW_AUDIT_LOGS:  ['SUPER_ADMIN', 'ADMIN'],
  EXPORT_ASSETS:    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'DESIGNER'],
  USE_AUTOMATION:   ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
} as const;

export type Permission = keyof typeof PERMISSIONS;

export function hasPermission(role: string, permission: Permission): boolean {
  return (PERMISSIONS[permission] as readonly string[]).includes(role);
}

export function requirePermission(role: string, permission: Permission): void {
  if (!hasPermission(role, permission)) throw new ApiError(403, `Forbidden: requires ${permission} permission`);
}

export async function getServerSession() {
  if (!detectCapabilities().auth) return null;
  try {
    const { getServerSession: nextAuthGetServerSession } = require('next-auth');
    const session = await nextAuthGetServerSession(authOptions);
    if (!session?.user) throw new ApiError(401, 'Authentication required');
    return session;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    return null;
  }
}

export async function getAuthUser() {
  if (!detectCapabilities().auth) throw new ApiError(503, 'Authentication not configured');
  try {
    const { getServerSession: nextAuthGetServerSession } = require('next-auth');
    const session = await nextAuthGetServerSession(authOptions);
    if (!session?.user) throw new ApiError(401, 'Authentication required');
    const user = session.user as any;
    return { id: user.id as string, email: user.email as string, role: user.role as string, orgId: user.orgId as string };
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(401, 'Authentication required');
  }
}

export async function hashPassword(password: string): Promise<string> {
  const { hash } = require('bcryptjs');
  return hash(password, 12);
}

export function validatePasswordStrength(password: string): string | null {
  if (password.length < 8)  return 'Password must be at least 8 characters';
  if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter';
  if (!/[0-9]/.test(password)) return 'Password must contain at least one number';
  return null;
}

export async function createAuditLog(opts: { userId: string; orgId: string; action: string; resourceType: string; resourceId?: string; metadata?: any; req?: NextRequest }) {
  if (!detectCapabilities().database) return;
  try {
    const { prisma } = require('./prisma');
    await prisma.auditLog.create({
      data: {
        userId:       opts.userId,
        orgId:        opts.orgId,
        action:       opts.action,
        resourceType: opts.resourceType,
        resourceId:   opts.resourceId,
        metadata:     opts.metadata ? JSON.stringify(opts.metadata) : undefined,
        ipAddress:    opts.req?.headers.get('x-forwarded-for') ?? opts.req?.headers.get('x-real-ip'),
        userAgent:    opts.req?.headers.get('user-agent'),
      },
    });
  } catch { /* non-fatal */ }
}

export async function getRequestUser(req: NextRequest) {
  if (!detectCapabilities().auth) throw new ApiError(503, 'Authentication not configured');
  const userId = req.headers.get('x-user-id');
  const role   = req.headers.get('x-user-role') ?? 'VIEWER';
  const orgId  = req.headers.get('x-org-id') ?? '';
  if (userId) return { id: userId, role, orgId };

  try {
    const { getServerSession: nextAuthGetServerSession } = require('next-auth');
    const session = await nextAuthGetServerSession(authOptions);
    if (!session?.user) throw new ApiError(401, 'Authentication required');
    const user = session.user as any;
    return { id: user.id as string, email: user.email as string, role: user.role as string, orgId: user.orgId as string };
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(401, 'Authentication required');
  }
}

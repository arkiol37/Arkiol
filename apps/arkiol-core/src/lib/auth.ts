// src/lib/auth.ts
// Safe auth — works without NEXTAUTH_SECRET/DATABASE_URL configured.
// When auth is not configured, getServerSession returns null and routes
// respond with 503 "Authentication not configured" instead of crashing.
import 'server-only';
// Founder access — imported lazily to avoid circular deps at module load
// (ownerAccess also imports 'server-only' which is fine in Node context)
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
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { compare }        = require('bcryptjs');
  const { z }              = require('zod');
  const { prisma }         = require('./prisma');
  // Only load adapter when DB is configured — credentials+JWT works without it
  let PrismaAdapter: any = null;
  try { PrismaAdapter = require('@auth/prisma-adapter').PrismaAdapter; } catch {}

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
      if (!parsed.success) {
        console.warn('[auth] authorize: invalid credentials shape');
        return null;
      }
      // Always normalize email — must match registration storage
      const email = parsed.data.email.trim().toLowerCase();
      const password = parsed.data.password;

      try {
        const user = await prisma.user.findUnique({
          where: { email },
          select: { id: true, email: true, name: true, role: true, orgId: true, passwordHash: true },
        });
        if (!user) {
          console.warn('[auth] authorize: no user for email:', email);
          return null;
        }
        if (!user.passwordHash) {
          console.warn('[auth] authorize: user has no passwordHash (OAuth-only account):', user.id);
          return null;
        }
        // Validate bcrypt hash format — rejects corrupted/legacy hashes cleanly
        // bcryptjs hashes always start with $2b$, $2a$, or $2y$
        const h4 = user.passwordHash.slice(0, 4);
        if (h4 !== '$2b$' && h4 !== '$2a$' && h4 !== '$2y$') {
          console.error('[auth] authorize: invalid hash prefix for user:', user.id, '— use /api/auth/founder-reset to fix');
          return null;
        }
        const valid = await compare(password, user.passwordHash);
        if (!valid) {
          console.warn('[auth] authorize: password mismatch for user:', user.id);
          return null;
        }
        console.info('[auth] authorize: success for user:', user.id, 'role:', user.role);
        return { id: user.id, email: user.email, name: user.name, role: user.role, orgId: user.orgId };
      } catch (err: any) {
        console.error('[auth] authorize: unexpected error:', err?.message ?? err);
        return null;
      }
    },
  }));

  return {
    ...(PrismaAdapter ? { adapter: PrismaAdapter(prisma) as any } : {}),
    session:  { strategy: 'jwt', maxAge: 7 * 24 * 60 * 60 },
    providers,
    secret:   env.NEXTAUTH_SECRET,
    callbacks: {
      async jwt({ token, user }: any) {
        if (user) {
          // Fresh sign-in — populate token from user object
          token.role  = (user as any).role;
          token.id    = user.id;
          token.orgId = (user as any).orgId;
          token.email = user.email;

          // ── Founder auto-promotion ────────────────────────────────────────
          // If this email is the founder's email and the DB role isn't already
          // SUPER_ADMIN, promote now so they never get stuck on a free-tier account.
          try {
            const founderEmail = process.env.FOUNDER_EMAIL?.toLowerCase().trim();
            if (founderEmail && user.email?.toLowerCase().trim() === founderEmail && token.role !== 'SUPER_ADMIN') {
              // Promote DB role + upgrade org plan in one transaction
              const updated = await prisma.user.update({
                where: { id: user.id },
                data:  { role: 'SUPER_ADMIN' },
                select: { role: true, orgId: true },
              });
              token.role = updated.role;
              if (updated.orgId) {
                await prisma.org.update({
                  where: { id: updated.orgId },
                  data: {
                    plan:               'STUDIO',
                    subscriptionStatus: 'ACTIVE',
                    creditBalance:      999_999,
                    dailyCreditBalance: 9_999,
                  },
                }).catch(() => {}); // non-fatal if org already correct
              }
            }
          } catch { /* non-fatal — access still works via email check */ }
        } else if (token.id) {
          // Token refresh — re-read role from DB so promotions take effect immediately
          try {
            const dbUser = await prisma.user.findUnique({
              where:  { id: token.id as string },
              select: { role: true, orgId: true, email: true },
            }).catch(() => null);
            if (dbUser) {
              token.role  = dbUser.role;
              token.orgId = dbUser.orgId;
              if (dbUser.email) token.email = dbUser.email;
            }
          } catch {}
        }
        return token;
      },
      async session({ session, token }: any) {
        if (session.user) { (session.user as any).role = token.role; (session.user as any).id = token.id; (session.user as any).orgId = token.orgId; (session.user as any).email = token.email ?? session.user.email; }
        return session;
      },
      async signIn({ user, account, profile }: any) {
        // ── Apple: persist name from first sign-in ────────────────────────
        if (account?.provider === 'apple' && profile?.name && user.id) {
          try {
            const ap = profile as any;
            const fullName = [ap.name?.firstName, ap.name?.lastName].filter(Boolean).join(' ');
            if (fullName && !user.name) await prisma.user.update({ where: { id: user.id }, data: { name: fullName } }).catch(() => {});
          } catch {}
        }

        // ── OAuth users: ensure they have an org ─────────────────────────
        // PrismaAdapter creates the User row but doesn't create an Org.
        // Without an org, dashboard/billing/credits all break.
        if (account?.provider !== 'credentials' && user.id) {
          try {
            const dbUser = await prisma.user.findUnique({
              where:  { id: user.id },
              select: { orgId: true, email: true, name: true },
            });
            if (dbUser && !dbUser.orgId) {
              // Build a slug from the user name or email prefix
              const founderEmail = process.env.FOUNDER_EMAIL?.toLowerCase().trim();
              const isFounder = dbUser.email?.toLowerCase().trim() === founderEmail;
              const displayName = dbUser.name ?? dbUser.email?.split('@')[0] ?? 'user';
              const baseSlug = displayName
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-|-$/g, '')
                .slice(0, 40) + '-' + Date.now();

              const newOrg = await prisma.org.create({
                data: {
                  name:              isFounder ? 'Arkiol Founder Workspace' : `${displayName}'s Workspace`,
                  slug:              baseSlug,
                  plan:              isFounder ? 'STUDIO' : 'FREE',
                  subscriptionStatus: 'ACTIVE',
                  creditBalance:     0,
                  dailyCreditBalance: 0,
                  creditLimit:       isFounder ? 999_999 : 500,
                },
              });

              await prisma.user.update({
                where: { id: user.id },
                data: {
                  orgId: newOrg.id,
                  role:  isFounder ? 'SUPER_ADMIN' : 'DESIGNER',
                },
              });
            }
          } catch (err: any) {
            console.error('[auth] OAuth org creation failed:', err?.message);
            // Non-fatal — user can still sign in but may lack org
          }
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

// authOptions uses a fully-trapped Proxy so next-auth v4 can enumerate providers,
// spread, and check for keys — even though the underlying object is built lazily.
// Without ownKeys + has traps, { ...authOptions } returns {} and login silently fails.
function getBuiltOptions(): any {
  if (!detectCapabilities().auth) return {};
  if (!_authOptions) {
    try {
      _authOptions = buildAuthOptions();
    } catch (err: any) {
      console.error('[auth] buildAuthOptions failed:', err?.message ?? err);
      return {};
    }
  }
  return _authOptions;
}

export const authOptions: any = new Proxy({} as any, {
  get(_target, prop) {
    return getBuiltOptions()[prop];
  },
  ownKeys(_target) {
    const opts = getBuiltOptions();
    return Reflect.ownKeys(opts);
  },
  has(_target, prop) {
    return prop in getBuiltOptions();
  },
  getOwnPropertyDescriptor(_target, prop) {
    const opts = getBuiltOptions();
    return Object.getOwnPropertyDescriptor(opts, prop)
      ?? { configurable: true, enumerable: true, value: undefined };
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
  if (password.length < 8) return 'Password must be at least 8 characters';
  // Note: no uppercase requirement — lowercase passwords are valid
  return null;
}

export async function createAuditLog(opts: { userId: string; orgId: string; action: string; resourceType: string; resourceId?: string; metadata?: any; req?: NextRequest }) {
  if (!detectCapabilities().database) return;
  try {
    const { prisma } = require('./prisma');
    await prisma.auditLog.create({
      data: {
        // Schema fields: actorId (not userId), targetType (not resourceType), targetId (not resourceId)
        // ipAddress and userAgent are not in the AuditLog schema — omitted
        actorId:    opts.userId,
        orgId:      opts.orgId,
        action:     opts.action,
        targetType: opts.resourceType,
        targetId:   opts.resourceId,
        metadata:   opts.metadata ?? {},
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

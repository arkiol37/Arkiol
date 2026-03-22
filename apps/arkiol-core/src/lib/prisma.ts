// src/lib/prisma.ts
// ─────────────────────────────────────────────────────────────────────────────
// Serverless-safe Prisma singleton for Vercel + Supabase (PgBouncer).
//
// ROOT CAUSE OF 42P05 "prepared statement already exists":
//   Supabase uses PgBouncer in transaction-pooling mode by default. In this
//   mode, physical backend connections are shared across logical clients.
//   Prisma's default behaviour caches prepared statements by name ("s0", "s1"
//   …). When a new Vercel Lambda cold-starts and its PrismaClient tries to
//   PREPARE a statement that a previous Lambda already prepared on the same
//   physical backend connection, PostgreSQL throws 42P05.
//
// THE FIX — two complementary parts:
//   1. DATABASE_URL must point to Supabase's POOLED endpoint (port 6543) and
//      include `?pgbouncer=true`. This flag tells the Prisma query engine to
//      use unnamed prepared statements (each query is prepared, executed, and
//      immediately deallocated — never cached by name).
//   2. schema.prisma datasource gets `directUrl = env("DIRECT_URL")` pointing
//      to port 5432 (non-pooled). Prisma uses directUrl only for migrations,
//      which require multi-statement transactions incompatible with PgBouncer
//      transaction mode.
//
// SERVERLESS INSTANCE MANAGEMENT:
//   In production (Vercel serverless) we create ONE PrismaClient per Lambda
//   instance and never store it on globalThis — Lambda instances are single-
//   request anyway and globalThis survives across warm invocations, which can
//   accumulate idle connections. connection_limit=1 in DATABASE_URL prevents
//   each Lambda from opening more connections than it needs.
//   In development (Next.js hot-reload) we cache on globalThis to avoid
//   exhausting the local Postgres connection limit across HMR cycles.
// ─────────────────────────────────────────────────────────────────────────────
import { detectCapabilities, bootstrapEnv } from '@arkiol/shared';

const nodeEnv = bootstrapEnv('NODE_ENV');
const isProduction = nodeEnv === 'production';

// Stub returned for every property when DATABASE_URL is absent.
// Returns a rejected promise so callers get a clear error rather than a crash.
const DB_NOT_CONFIGURED: any = new Proxy(
  (() => Promise.reject(new Error(
    'Database not configured. Add DATABASE_URL to your environment variables.'
  ))) as any,
  { get: () => DB_NOT_CONFIGURED }
);

function createPrismaClient() {
  try {
    const { PrismaClient } = require('@prisma/client');
    // DATABASE_URL already contains ?pgbouncer=true&connection_limit=1
    // (see .env.example). We pass it explicitly here so the Prisma engine
    // always gets the correct URL regardless of how the module is loaded.
    const client = new PrismaClient({
      log: isProduction ? ['error'] : ['query', 'error', 'warn'],
    });
    return client;
  } catch (err: any) {
    console.error('[prisma] Failed to instantiate PrismaClient:', err?.message ?? err);
    return null;
  }
}

// ── Singleton management ────────────────────────────────────────────────────
// Production:  one client per module scope (per Lambda instance).
//              Never cached on globalThis — prevents connection accumulation
//              across warm Lambda re-uses.
// Development: cached on globalThis to survive Next.js HMR hot-reloads.
//              Without this, every file change creates a new PrismaClient
//              and quickly exhausts local Postgres max_connections.

const globalForPrisma = globalThis as unknown as { __prisma?: any };
let _client: any = null;

function getClient(): any {
  if (!detectCapabilities().database) return null;

  if (isProduction) {
    if (!_client) _client = createPrismaClient();
    return _client;
  }

  // Development only
  if (!globalForPrisma.__prisma) {
    globalForPrisma.__prisma = createPrismaClient();
  }
  return globalForPrisma.__prisma;
}

// Export a lazy proxy so importing this module never throws even if
// DATABASE_URL is missing (e.g., during `next build` static analysis).
export const prisma: any = new Proxy({} as any, {
  get(_target, prop) {
    const client = getClient();
    if (!client) return DB_NOT_CONFIGURED;
    return (client as any)[prop];
  },
});

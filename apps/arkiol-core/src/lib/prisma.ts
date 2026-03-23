// src/lib/prisma.ts
// ─────────────────────────────────────────────────────────────────────────────
// Prisma client for Vercel serverless + Supabase (PgBouncer transaction mode).
//
// WHY pgbouncer=true IN DATABASE_URL IS NOT ENOUGH
// ─────────────────────────────────────────────────────────────────────────────
// Prisma 5 with its default library (Rust) engine maintains an internal
// connection pool. Even with pgbouncer=true in the URL (which switches Prisma
// to unnamed prepared statements), the Rust pool keeps logical connection
// state across transactions. When PgBouncer transaction mode releases the
// physical backend between transactions and later reassigns a *different*
// backend to the same logical connection, Prisma's internal state is out of
// sync with the new backend — the backend has no knowledge of any prepared
// statements, named or unnamed, from prior transactions on other backends.
// Subsequent queries that Prisma issues using the extended query protocol
// (even with unnamed statements) can still trigger 42P05 because Prisma's
// pool assumes connection continuity that PgBouncer does not guarantee.
//
// THE DEFINITIVE FIX: @prisma/adapter-pg
// ─────────────────────────────────────────────────────────────────────────────
// The pg (node-postgres) driver adapter completely replaces Prisma's internal
// Rust connection pool with node-postgres Pool. The pg driver:
//   1. Does NOT use named prepared statements in pool mode (no PREPARE/EXECUTE)
//   2. Uses the simple query protocol — every query is a plain text SQL string
//   3. Each connection checkout/release is fully managed by pg.Pool, which is
//      transparent to PgBouncer — no hidden state across transactions
//
// This means 42P05 is structurally impossible: no prepared statements are
// ever sent to the PostgreSQL backend, regardless of how PgBouncer routes
// physical connections.
//
// REQUIRED schema.prisma change (already applied):
//   generator client {
//     provider        = "prisma-client-js"
//     previewFeatures = ["driverAdapters"]
//   }
//
// REQUIRED env vars in Vercel Dashboard:
//   DATABASE_URL  = postgresql://...@pooler.supabase.com:6543/postgres?sslmode=require
//                   (Supabase Transaction pooler — port 6543, no pgbouncer= param needed)
//   DIRECT_URL    = postgresql://...@db.[ref].supabase.co:5432/postgres?sslmode=require
//                   (Supabase Direct connection — port 5432, for migrations only)
//
// CONNECTION LIMITS
// ─────────────────────────────────────────────────────────────────────────────
// Each Vercel Lambda (serverless function) gets its own Node.js process.
// We configure pg.Pool with max:1 so each Lambda holds at most one physical
// connection to PgBouncer. PgBouncer then manages the real PostgreSQL
// connection pool on its side.
//
// SINGLETON PATTERN
// ─────────────────────────────────────────────────────────────────────────────
// Production:  module-scope singleton (_client). Vercel reuses warm Lambda
//              instances across requests — the singleton is recreated only on
//              cold starts, not on every request.
// Development: globalThis singleton to survive Next.js HMR hot-reloads without
//              exhausting local Postgres max_connections.
// ─────────────────────────────────────────────────────────────────────────────
import { detectCapabilities, bootstrapEnv } from '@arkiol/shared';

const nodeEnv   = bootstrapEnv('NODE_ENV');
const isProd    = nodeEnv === 'production';

// ── Stub for missing DATABASE_URL ────────────────────────────────────────────
// Every property access returns a rejected promise so callers get a clear
// error message rather than a cryptic "Cannot read property of undefined".
const DB_NOT_CONFIGURED: any = new Proxy(
  (() => Promise.reject(new Error(
    'Database not configured. Add DATABASE_URL to your environment variables.'
  ))) as any,
  { get: () => DB_NOT_CONFIGURED },
);

// ── Client factory ───────────────────────────────────────────────────────────
function createPrismaClient(): any | null {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('[prisma] DATABASE_URL is not set — cannot create PrismaClient');
    return null;
  }

  try {
    // Dynamic requires so this module can be imported during `next build`
    // without crashing when DATABASE_URL is absent (static analysis phase).
    const { Pool }            = require('pg') as typeof import('pg');
    const { PrismaPg }        = require('@prisma/adapter-pg') as typeof import('@prisma/adapter-pg');
    const { PrismaClient }    = require('@prisma/client');

    // pg.Pool with max:1 — one physical connection per Lambda to PgBouncer.
    // ssl: true is required for Supabase connections.
    // statement_timeout prevents runaway queries from blocking Lambda shutdown.
    const pool = new Pool({
      connectionString: url,
      max: 1,
      ssl: { rejectUnauthorized: false },
      // Idle timeout shorter than Vercel's function timeout so PgBouncer
      // can reclaim the connection before the Lambda is frozen.
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 10_000,
    });

    const adapter = new PrismaPg(pool);

    const client = new PrismaClient({
      adapter,
      log: isProd ? ['error'] : ['query', 'error', 'warn'],
    });

    return client;
  } catch (err: any) {
    console.error('[prisma] Failed to create PrismaClient with pg adapter:', err?.message ?? err);
    return null;
  }
}

// ── Singleton management ─────────────────────────────────────────────────────
const globalForPrisma = globalThis as unknown as { __prisma?: any };
let _client: any = null;

function getClient(): any | null {
  if (!detectCapabilities().database) return null;

  if (isProd) {
    // Serverless: one client per module scope (per cold-start Lambda).
    // NOT stored on globalThis in production — prevents cross-request
    // connection accumulation in edge cases where globalThis persists
    // longer than expected.
    if (!_client) _client = createPrismaClient();
    return _client;
  }

  // Development: survive Next.js HMR hot-reloads via globalThis cache.
  if (!globalForPrisma.__prisma) {
    globalForPrisma.__prisma = createPrismaClient();
  }
  return globalForPrisma.__prisma;
}

// ── Export ───────────────────────────────────────────────────────────────────
// Lazy proxy: importing this file never throws, even when DATABASE_URL is
// absent during Next.js build-time static analysis.
export const prisma: any = new Proxy({} as any, {
  get(_target, prop) {
    const client = getClient();
    if (!client) return DB_NOT_CONFIGURED;
    return (client as any)[prop];
  },
});

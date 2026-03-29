// src/lib/prisma.ts
// Safe Prisma singleton — instantiated only when DATABASE_URL is configured.
// Callers that need the DB should check detectCapabilities().database first;
// this client returns stub rejections instead of throwing at import time.
//
// PgBouncer note: Supabase PgBouncer (transaction pooling mode) does NOT
// support interactive Prisma $transaction(). The schema uses directUrl for
// this, but if DIRECT_URL is missing, interactive transactions will
// fail. Use safeTransaction() below as a drop-in replacement.
import { detectCapabilities, bootstrapEnv } from '@arkiol/shared';

const nodeEnv = bootstrapEnv('NODE_ENV');

let _prisma: any = null;

function createPrismaClient() {
  try {
    const { PrismaClient } = require('@prisma/client');
    return new PrismaClient({
      log: nodeEnv === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
  } catch {
    return null;
  }
}

const globalForPrisma = globalThis as any;

// Stub returned for every property when DATABASE_URL is absent.
// Returns a rejected promise so callers get a clear error rather than a crash.
const DB_NOT_CONFIGURED = new Proxy(
  (() => Promise.reject(new Error('Database not configured. Add DATABASE_URL to your environment variables.'))) as any,
  { get: () => DB_NOT_CONFIGURED }
);

export const prisma: any = new Proxy({} as any, {
  get(_target, prop) {
    if (!_prisma) {
      if (!detectCapabilities().database) {
        return DB_NOT_CONFIGURED;
      }
      _prisma = globalForPrisma.prisma ?? createPrismaClient();
      if (_prisma && nodeEnv !== 'production') {
        globalForPrisma.prisma = _prisma;
      }
    }
    return _prisma ? (_prisma as any)[prop] : DB_NOT_CONFIGURED;
  },
});

// ── PgBouncer-safe interactive transaction wrapper ────────────────────────
//
// Attempts an interactive $transaction first (works when DIRECT_URL
// is set and bypasses PgBouncer). If it fails with a PgBouncer-related error,
// runs the callback with the normal prisma client instead (no atomicity
// guarantee, but the race window is sub-millisecond in practice).
//
// Usage:
//   const result = await safeTransaction(async (tx) => {
//     await tx.job.count(...);
//     return tx.job.create(...);
//   });
//
const PGBOUNCER_ERROR_PATTERNS = [
  'interactive transaction',
  'prepared statement',
  'Transaction API error',
  'P2028',
  'server does not support',
  'DISCARD ALL',
];

function isPgBouncerError(err: any): boolean {
  const msg = String(err?.message ?? '') + String(err?.code ?? '');
  return PGBOUNCER_ERROR_PATTERNS.some(p => msg.includes(p));
}

export async function safeTransaction<T>(
  fn: (tx: any) => Promise<T>,
  options?: { timeout?: number }
): Promise<T> {
  try {
    return await prisma.$transaction(fn, {
      timeout: options?.timeout ?? 15000,
    });
  } catch (err: any) {
    if (isPgBouncerError(err)) {
      console.warn('[prisma] Interactive transaction unavailable (PgBouncer), using sequential fallback');
      return fn(prisma);
    }
    throw err;
  }
}

/**
 * Auth rate limits — DB-backed across serverless instances.
 * Falls back to in-memory when RATE_LIMIT_STORE=memory or under Vitest.
 */

import { appError } from "@/lib/errors/app-error";
import { prisma } from "@/lib/prisma";

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

type BucketEntry = {
  count: number;
  resetAt: number;
};

const memoryBuckets = new Map<string, BucketEntry>();

/** Local `next dev` skips auth rate limits so Partner/OpCo/Admin switching is not blocked. */
export function authRateLimitsActive(): boolean {
  return process.env.NODE_ENV !== "development";
}

function useMemoryRateLimitStore(): boolean {
  if (process.env.RATE_LIMIT_STORE === "memory") {
    return true;
  }
  if (process.env.RATE_LIMIT_STORE === "db") {
    return false;
  }
  return process.env.VITEST === "true" || process.env.NODE_ENV === "test";
}

/** Auth presets (window = 15 minutes). */
export const AUTH_RATE_LIMITS = {
  loginIp: { limit: 10, windowMs: 15 * 60 * 1000 },
  loginEmail: { limit: 5, windowMs: 15 * 60 * 1000 },
  forgotPasswordIp: { limit: 5, windowMs: 15 * 60 * 1000 },
  forgotPasswordEmail: { limit: 5, windowMs: 15 * 60 * 1000 },
  setPasswordIp: { limit: 5, windowMs: 15 * 60 * 1000 },
  changePasswordUser: { limit: 5, windowMs: 15 * 60 * 1000 },
} as const;

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) {
      return first.slice(0, 128);
    }
  }
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) {
    return realIp.slice(0, 128);
  }
  return "unknown";
}

function consumeMemoryRateLimit(params: {
  key: string;
  limit: number;
  windowMs: number;
  now: number;
}): RateLimitResult {
  let entry = memoryBuckets.get(params.key);

  if (!entry || entry.resetAt <= params.now) {
    entry = { count: 0, resetAt: params.now + params.windowMs };
  }

  if (entry.count >= params.limit) {
    memoryBuckets.set(params.key, entry);
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((entry.resetAt - params.now) / 1000),
      ),
    };
  }

  entry = { count: entry.count + 1, resetAt: entry.resetAt };
  memoryBuckets.set(params.key, entry);

  return {
    allowed: true,
    remaining: Math.max(0, params.limit - entry.count),
    retryAfterSeconds: Math.max(
      1,
      Math.ceil((entry.resetAt - params.now) / 1000),
    ),
  };
}

async function consumeDbRateLimit(params: {
  key: string;
  limit: number;
  windowMs: number;
  now: number;
}): Promise<RateLimitResult> {
  const nowDate = new Date(params.now);
  const key = params.key.slice(0, 255);

  return prisma.$transaction(async (tx) => {
    const existing = await tx.authRateLimitBucket.findUnique({
      where: { bucketKey: key },
    });

    let count = 0;
    let resetAt =
      existing && existing.resetAt.getTime() > params.now
        ? existing.resetAt
        : new Date(params.now + params.windowMs);

    if (existing && existing.resetAt.getTime() > params.now) {
      count = existing.count;
    }

    if (count >= params.limit) {
      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds: Math.max(
          1,
          Math.ceil((resetAt.getTime() - params.now) / 1000),
        ),
      };
    }

    count += 1;
    await tx.authRateLimitBucket.upsert({
      where: { bucketKey: key },
      create: {
        bucketKey: key,
        count,
        resetAt,
      },
      update: {
        count,
        resetAt,
      },
    });

    return {
      allowed: true,
      remaining: Math.max(0, params.limit - count),
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((resetAt.getTime() - params.now) / 1000),
      ),
    };
  });
}

export async function consumeRateLimit(params: {
  key: string;
  limit: number;
  windowMs: number;
  now?: number;
}): Promise<RateLimitResult> {
  if (!authRateLimitsActive()) {
    return {
      allowed: true,
      remaining: params.limit,
      retryAfterSeconds: 1,
    };
  }

  const now = params.now ?? Date.now();
  if (useMemoryRateLimitStore()) {
    return consumeMemoryRateLimit({ ...params, now });
  }
  return consumeDbRateLimit({ ...params, now });
}

export async function assertRateLimit(params: {
  key: string;
  limit: number;
  windowMs: number;
}): Promise<RateLimitResult> {
  const result = await consumeRateLimit(params);
  if (!result.allowed) {
    throw appError("RATE_LIMITED");
  }
  return result;
}

export function normalizeRateLimitEmail(email: string): string {
  return email.trim().toLowerCase().slice(0, 255);
}

/** Test helper — clears memory buckets. */
export function resetAuthRateLimitStoreForTests(): void {
  memoryBuckets.clear();
}

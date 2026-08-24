/**
 * In-memory sliding-window rate limits for auth endpoints.
 * Suitable for a single Node process; use a shared store if you run multiple instances.
 */

import { appError } from "@/lib/errors/app-error";

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

type BucketEntry = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, BucketEntry>();

/** Local `next dev` skips auth rate limits so Partner/OpCo/Admin switching is not blocked. */
export function authRateLimitsActive(): boolean {
  return process.env.NODE_ENV !== "development";
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

export function consumeRateLimit(params: {
  key: string;
  limit: number;
  windowMs: number;
  now?: number;
}): RateLimitResult {
  if (!authRateLimitsActive()) {
    return {
      allowed: true,
      remaining: params.limit,
      retryAfterSeconds: 1,
    };
  }

  const now = params.now ?? Date.now();
  let entry = buckets.get(params.key);

  if (!entry || entry.resetAt <= now) {
    entry = { count: 0, resetAt: now + params.windowMs };
  }

  if (entry.count >= params.limit) {
    buckets.set(params.key, entry);
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
    };
  }

  entry = { count: entry.count + 1, resetAt: entry.resetAt };
  buckets.set(params.key, entry);

  return {
    allowed: true,
    remaining: Math.max(0, params.limit - entry.count),
    retryAfterSeconds: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
  };
}

export function assertRateLimit(params: {
  key: string;
  limit: number;
  windowMs: number;
}): RateLimitResult {
  const result = consumeRateLimit(params);
  if (!result.allowed) {
    throw appError("RATE_LIMITED");
  }
  return result;
}

export function normalizeRateLimitEmail(email: string): string {
  return email.trim().toLowerCase().slice(0, 255);
}

/** Test helper — clears all buckets. */
export function resetAuthRateLimitStoreForTests(): void {
  buckets.clear();
}

import { describe, expect, it, beforeEach } from "vitest";

import {
  authRateLimitsActive,
  consumeRateLimit,
  getClientIp,
  resetAuthRateLimitStoreForTests,
} from "@/lib/auth/rate-limit";

describe("authRateLimitsActive", () => {
  it("stays on outside next dev (tests and production)", () => {
    expect(authRateLimitsActive()).toBe(true);
  });
});

describe("consumeRateLimit", () => {
  beforeEach(() => {
    resetAuthRateLimitStoreForTests();
  });

  it("allows up to the limit then blocks", () => {
    const key = "test:ip:1";
    const windowMs = 60_000;
    for (let i = 0; i < 3; i += 1) {
      const result = consumeRateLimit({ key, limit: 3, windowMs });
      expect(result.allowed).toBe(true);
    }
    const blocked = consumeRateLimit({ key, limit: 3, windowMs });
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("resets after the window", () => {
    const key = "test:ip:2";
    const t0 = 1_000_000;
    consumeRateLimit({ key, limit: 1, windowMs: 1000, now: t0 });
    expect(
      consumeRateLimit({ key, limit: 1, windowMs: 1000, now: t0 + 500 }).allowed,
    ).toBe(false);
    expect(
      consumeRateLimit({ key, limit: 1, windowMs: 1000, now: t0 + 1001 }).allowed,
    ).toBe(true);
  });
});

describe("getClientIp", () => {
  it("prefers the first x-forwarded-for hop", () => {
    const request = new Request("http://localhost/api/auth", {
      headers: {
        "x-forwarded-for": "203.0.113.10, 10.0.0.1",
        "x-real-ip": "10.0.0.2",
      },
    });
    expect(getClientIp(request)).toBe("203.0.113.10");
  });
});

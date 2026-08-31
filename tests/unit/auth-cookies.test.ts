/**
 * Unit tests for explicit NextAuth cookie / CSRF flags (S15).
 */

import { describe, expect, it } from "vitest";

import {
  buildAuthCookies,
  getSessionTokenCookieName,
  secureAuthCookiesEnabled,
} from "@/lib/auth/cookies";

describe("buildAuthCookies", () => {
  it("locks HttpOnly + SameSite=lax for session and CSRF cookies", () => {
    const cookies = buildAuthCookies(false);
    expect(cookies.sessionToken?.options.httpOnly).toBe(true);
    expect(cookies.sessionToken?.options.sameSite).toBe("lax");
    expect(cookies.sessionToken?.options.secure).toBe(false);
    expect(cookies.sessionToken?.name).toBe("next-auth.session-token");

    expect(cookies.csrfToken?.options.httpOnly).toBe(true);
    expect(cookies.csrfToken?.options.sameSite).toBe("lax");
    expect(cookies.csrfToken?.name).toBe("next-auth.csrf-token");
  });

  it("uses Secure prefixes on HTTPS", () => {
    const cookies = buildAuthCookies(true);
    expect(cookies.sessionToken?.options.secure).toBe(true);
    expect(cookies.sessionToken?.name).toBe(
      "__Secure-next-auth.session-token",
    );
    expect(cookies.csrfToken?.name).toBe("__Host-next-auth.csrf-token");
  });

  it("uses a separate Admin cookie namespace", () => {
    const cookies = buildAuthCookies(false, "admin");
    expect(cookies.sessionToken?.name).toBe("next-auth.admin-session-token");
    expect(cookies.csrfToken?.name).toBe("next-auth.admin-csrf-token");
    expect(getSessionTokenCookieName("admin", false)).toBe(
      "next-auth.admin-session-token",
    );
    expect(getSessionTokenCookieName("admin", true)).toBe(
      "__Secure-next-auth.admin-session-token",
    );
  });
});

describe("secureAuthCookiesEnabled", () => {
  it("follows NEXTAUTH_URL scheme when set", () => {
    const prev = process.env.NEXTAUTH_URL;
    process.env.NEXTAUTH_URL = "https://app.example.com";
    expect(secureAuthCookiesEnabled()).toBe(true);
    process.env.NEXTAUTH_URL = "http://localhost:3000";
    expect(secureAuthCookiesEnabled()).toBe(false);
    process.env.NEXTAUTH_URL = prev;
  });
});

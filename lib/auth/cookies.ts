/**
 * Explicit NextAuth cookie options (S15).
 * Locks SameSite=Lax + HttpOnly so CSRF defense is not only a library default.
 * Secure (+ __Secure- / __Host- prefixes) when the app is served over HTTPS.
 */

import type { CookiesOptions } from "next-auth";

/**
 * Prefer HTTPS detection from NEXTAUTH_URL; fall back to production NODE_ENV.
 * Local http://localhost must keep secure:false or the browser will drop cookies.
 */
export function secureAuthCookiesEnabled(): boolean {
  const url = process.env.NEXTAUTH_URL?.trim();
  if (url) {
    return url.startsWith("https://");
  }
  return process.env.NODE_ENV === "production";
}

/** Session + CSRF cookies with locked SameSite / HttpOnly / Secure. */
export function buildAuthCookies(
  secure = secureAuthCookiesEnabled(),
): Partial<CookiesOptions> {
  const prefix = secure ? "__Secure-" : "";
  const hostPrefix = secure ? "__Host-" : "";

  const base = {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure,
  };

  return {
    sessionToken: {
      name: `${prefix}next-auth.session-token`,
      options: base,
    },
    callbackUrl: {
      name: `${prefix}next-auth.callback-url`,
      options: base,
    },
    csrfToken: {
      // __Host- requires Secure, Path=/, no Domain — NextAuth default pattern.
      name: `${hostPrefix}next-auth.csrf-token`,
      options: base,
    },
  };
}

/**
 * Explicit NextAuth cookie options (S15).
 * Locks SameSite=Lax + HttpOnly so CSRF defense is not only a library default.
 * Secure (+ __Secure- / __Host- prefixes) when the app is served over HTTPS.
 *
 * Admin and main portals use different cookie names so both can stay signed in
 * at the same time on the same origin (different login URLs).
 */

import type { CookiesOptions } from "next-auth";

export type AuthCookieNamespace = "main" | "admin";

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

function cookieBaseName(
  namespace: AuthCookieNamespace,
  kind: "session-token" | "callback-url" | "csrf-token",
): string {
  if (namespace === "admin") {
    return `next-auth.admin-${kind}`;
  }
  return `next-auth.${kind}`;
}

/** Absolute cookie name including Secure/Host prefixes when applicable. */
export function getSessionTokenCookieName(
  namespace: AuthCookieNamespace = "main",
  secure = secureAuthCookiesEnabled(),
): string {
  const prefix = secure ? "__Secure-" : "";
  return `${prefix}${cookieBaseName(namespace, "session-token")}`;
}

/** Session + CSRF cookies with locked SameSite / HttpOnly / Secure. */
export function buildAuthCookies(
  secure = secureAuthCookiesEnabled(),
  namespace: AuthCookieNamespace = "main",
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
      name: `${prefix}${cookieBaseName(namespace, "session-token")}`,
      options: base,
    },
    callbackUrl: {
      name: `${prefix}${cookieBaseName(namespace, "callback-url")}`,
      options: base,
    },
    csrfToken: {
      // __Host- requires Secure, Path=/, no Domain — NextAuth default pattern.
      name: `${hostPrefix}${cookieBaseName(namespace, "csrf-token")}`,
      options: base,
    },
  };
}

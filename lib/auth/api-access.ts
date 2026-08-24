/**
 * Which /api paths are public vs role-gated.
 * Used by middleware so new APIs cannot skip login by default.
 */

import type { AppRole } from "@/lib/auth/types";

/** No session required (or uses its own secret, e.g. cron). */
export function isPublicApiPath(pathname: string): boolean {
  if (pathname === "/api/health") {
    return true;
  }
  // Cron uses Bearer CRON_SECRET — do not require a user JWT.
  if (pathname.startsWith("/api/admin/cron")) {
    return true;
  }
  // NextAuth + forgot/set password are public; change-password is not.
  if (pathname.startsWith("/api/auth/")) {
    return pathname !== "/api/auth/change-password";
  }
  return false;
}

/**
 * True when this role may call this API prefix.
 * Unknown /api paths are denied (fail closed).
 */
export function roleMayAccessApiPath(role: AppRole, pathname: string): boolean {
  if (pathname === "/api/auth/change-password") {
    return true;
  }
  if (role === "admin") {
    return pathname.startsWith("/api/admin");
  }
  if (role === "client") {
    return pathname.startsWith("/api/dizlee");
  }
  if (role === "opco") {
    return pathname.startsWith("/api/opco");
  }
  if (role === "partner") {
    return pathname.startsWith("/api/partner");
  }
  return false;
}

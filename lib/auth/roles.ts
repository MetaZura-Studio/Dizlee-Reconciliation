/**
 * Portal home routes and pathname access rules by AppRole.
 * Consumed by middleware, post-login redirects, and layout guards.
 */

import { ADMIN_DEFAULT_ROUTE } from "@/lib/admin/navigation";
import type { MainPortalRole } from "@/lib/auth/scopes";
import type { AppRole } from "@/lib/auth/types";

const PORTAL_HOME: Record<AppRole, string> = {
  admin: ADMIN_DEFAULT_ROUTE,
  client: "/dizlee",
  opco: "/opco",
  partner: "/partner",
};

const MAIN_PORTAL_HOME: Record<MainPortalRole, string> = {
  client: "/dizlee",
  opco: "/opco",
  partner: "/partner",
};

export function getPortalHomePath(role: AppRole): string {
  return PORTAL_HOME[role];
}

export function getMainPortalHomePath(role: MainPortalRole): string {
  return MAIN_PORTAL_HOME[role];
}

/** Enforces role-specific URL prefixes; shared auth pages remain allowed. */
export function roleMayAccessPath(role: AppRole, pathname: string): boolean {
  if (pathname === "/admin/login") {
    return false;
  }
  if (role === "admin") return pathname.startsWith("/admin");
  if (role === "client") return pathname.startsWith("/dizlee");
  if (role === "opco") return pathname.startsWith("/opco");
  if (role === "partner") return pathname.startsWith("/partner");
  return false;
}

export function getLoginPathForPathname(pathname: string): string {
  if (pathname.startsWith("/admin")) {
    return "/admin/login";
  }
  return "/login";
}

import type { AppRole } from "@/lib/auth/types";

export const AUTH_LOGIN_SCOPES = ["main", "admin"] as const;

export type AuthLoginScope = (typeof AUTH_LOGIN_SCOPES)[number];

export const MAIN_PORTAL_ROLES = ["opco", "client", "partner"] as const;

export type MainPortalRole = (typeof MAIN_PORTAL_ROLES)[number];

export function isAuthLoginScope(value: string): value is AuthLoginScope {
  return (AUTH_LOGIN_SCOPES as readonly string[]).includes(value);
}

export function isMainPortalRole(role: string): role is MainPortalRole {
  return (MAIN_PORTAL_ROLES as readonly string[]).includes(role);
}

export function roleAllowedForLoginScope(
  role: AppRole,
  scope: AuthLoginScope,
): boolean {
  if (scope === "admin") {
    return role === "admin";
  }
  return isMainPortalRole(role);
}

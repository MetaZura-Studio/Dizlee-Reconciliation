/**
 * Cross-portal session user shape and role normalization from lookup codes.
 * Consumed by NextAuth callbacks, portal auth guards, and middleware route checks.
 * JWT/session fields mirror AppSessionUser; see docs/AUTH_SESSION.md for field semantics.
 */

export const APP_ROLES = ["admin", "client", "opco", "partner"] as const;

export type AppRole = (typeof APP_ROLES)[number];

export type AppSessionUser = {
  id: string;
  email: string;
  name?: string | null;
  role: AppRole;
  opcoId: string | null;
  partnerId: string | null;
};

export function isAppRole(value: string): value is AppRole {
  return (APP_ROLES as readonly string[]).includes(value);
}

/** Normalizes role lookup codes to lowercase AppRole values used in JWT/session. */
export function normalizeRoleCode(lookupCode: string): AppRole {
  const role = lookupCode.toLowerCase();
  if (!isAppRole(role)) {
    throw new Error(`Unsupported role lookup code: ${lookupCode}`);
  }
  return role;
}

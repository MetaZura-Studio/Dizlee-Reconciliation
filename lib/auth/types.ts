/**
 * Shared session contract for all portals.
 * See docs/AUTH_SESSION.md — other developers read these JWT fields in their own lib/<portal>/auth.ts.
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

export function normalizeRoleCode(lookupCode: string): AppRole {
  const role = lookupCode.toLowerCase();
  if (!isAppRole(role)) {
    throw new Error(`Unsupported role lookup code: ${lookupCode}`);
  }
  return role;
}

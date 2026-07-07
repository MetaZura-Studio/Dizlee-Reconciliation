/**
 * Partner-scoped auth helpers.
 * Shahrukh owns this module — reads shared JWT via lib/auth/options only.
 */

export type PartnerSession = {
  userId: string;
  email: string;
  role: "partner";
};

export function isPartnerRole(role: string): boolean {
  return role === "partner";
}

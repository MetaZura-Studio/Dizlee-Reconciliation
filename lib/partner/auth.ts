/**
 * Partner-scoped auth helpers.
 * Hussnain owns this module — do not import from other developers' lib/ folders.
 */

export type PartnerSession = {
  userId: string;
  email: string;
  role: "partner";
};

export function isPartnerRole(role: string): boolean {
  return role === "partner";
}

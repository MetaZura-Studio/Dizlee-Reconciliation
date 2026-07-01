/**
 * Admin-scoped auth helpers.
 * Hussnain owns this module — do not import from other developers' lib/ folders.
 */

export type AdminSession = {
  userId: string;
  email: string;
  role: "admin";
};

export function isAdminRole(role: string): boolean {
  return role === "admin";
}

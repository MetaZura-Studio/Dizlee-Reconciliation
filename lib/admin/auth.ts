/**
 * Admin-scoped auth helpers.
 * Hussnain owns this module — do not import from other developers' lib/ folders.
 */

import { redirect } from "next/navigation";

import { getAppSessionUser } from "@/lib/auth/session";
import type { AppSessionUser } from "@/lib/auth/types";

export type AdminSessionUser = AppSessionUser & { role: "admin" };

export function isAdminRole(role: string): boolean {
  return role === "admin";
}

export async function requireAdminUser(): Promise<AdminSessionUser> {
  const user = await getAppSessionUser();

  if (!user || !isAdminRole(user.role)) {
    redirect("/admin/login");
  }

  return user as AdminSessionUser;
}

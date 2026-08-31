/**
 * Admin portal session guards — redirects unauthenticated or non-admin users.
 * Used by Admin layout pages and re-exported types for Admin API routes.
 * Invariant: only users with role `admin` pass `requireAdminUser`.
 */

import { redirect } from "next/navigation";

import { getAdminAppSessionUser } from "@/lib/auth/session";
import type { AppSessionUser } from "@/lib/auth/types";

export type AdminSessionUser = AppSessionUser & { role: "admin" };

export function isAdminRole(role: string): boolean {
  return role === "admin";
}

export async function requireAdminUser(): Promise<AdminSessionUser> {
  const user = await getAdminAppSessionUser();

  if (!user || !isAdminRole(user.role)) {
    redirect("/admin/login");
  }

  return user as AdminSessionUser;
}

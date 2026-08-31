/**
 * Application session accessors built on NextAuth.
 * Main and Admin use separate cookie namespaces / auth option objects.
 */

import { getServerSession, type Session } from "next-auth";

import { adminAuthOptions, authOptions } from "@/lib/auth/options";
import type { AppSessionUser } from "@/lib/auth/types";

function toAppSessionUser(session: Session | null): AppSessionUser | null {
  if (!session?.user?.id || !session.user.role) {
    return null;
  }

  return {
    id: session.user.id,
    email: session.user.email ?? "",
    name: session.user.name,
    role: session.user.role,
    opcoId: session.user.opcoId,
    partnerId: session.user.partnerId,
  };
}

/** Main portal session (OpCo / Partner / Dizlee). */
export async function getAppSession() {
  return getServerSession(authOptions);
}

export async function getAppSessionUser(): Promise<AppSessionUser | null> {
  return toAppSessionUser(await getAppSession());
}

/** Admin portal session. */
export async function getAdminAppSession() {
  return getServerSession(adminAuthOptions);
}

export async function getAdminAppSessionUser(): Promise<AppSessionUser | null> {
  return toAppSessionUser(await getAdminAppSession());
}

/**
 * Shared pages (e.g. change-password) that either portal may use.
 * Prefers the main session, then Admin.
 */
export async function getAnyAppSessionUser(): Promise<AppSessionUser | null> {
  return (
    (await getAppSessionUser()) ?? (await getAdminAppSessionUser())
  );
}

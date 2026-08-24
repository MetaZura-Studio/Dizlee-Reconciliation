/**
 * Live user eligibility for an existing JWT/session.
 * Login already checks ACTIVE + not deleted; this re-checks after suspend/delete.
 */

import { isAppRole, normalizeRoleCode, type AppRole } from "@/lib/auth/types";
import { prisma } from "@/lib/prisma";

export type ActiveAuthClaims = {
  id: string;
  email: string;
  name: string | null;
  role: AppRole;
  opcoId: string | null;
  partnerId: string | null;
};

/** How often to hit the DB again for the same JWT (ms). */
export const AUTH_USER_REVALIDATE_MS = 30_000;

export async function loadActiveAuthUser(
  userId: string,
): Promise<ActiveAuthClaims | null> {
  if (!/^\d+$/.test(userId)) {
    return null;
  }

  const user = await prisma.user.findFirst({
    where: {
      id: BigInt(userId),
      isDeleted: false,
    },
    include: {
      role: true,
      status: true,
    },
  });

  if (!user?.passwordHash || user.status.code !== "ACTIVE") {
    return null;
  }

  const role = normalizeRoleCode(user.role.code);
  if (!isAppRole(role)) {
    return null;
  }

  if (role === "opco" && !user.opcoId) {
    return null;
  }

  if (role === "partner" && !user.partnerId) {
    return null;
  }

  return {
    id: user.id.toString(),
    email: user.email,
    name: user.name,
    role,
    opcoId: user.opcoId?.toString() ?? null,
    partnerId: user.partnerId?.toString() ?? null,
  };
}

export function shouldRevalidateAuthUser(
  lastValidatedAt: unknown,
  nowMs: number = Date.now(),
  intervalMs: number = AUTH_USER_REVALIDATE_MS,
): boolean {
  if (typeof lastValidatedAt !== "number" || !Number.isFinite(lastValidatedAt)) {
    return true;
  }
  return nowMs - lastValidatedAt >= intervalMs;
}

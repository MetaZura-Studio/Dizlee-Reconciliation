/**
 * OpCo / Partner org must be ACTIVE (and not deleted) for portal login / password flows.
 * Admin and Dizlee (client) users have no org — always allowed at this layer.
 */

import type { AppRole } from "@/lib/auth/types";
import { prisma } from "@/lib/prisma";

export async function isPortalOrgActiveForLogin(params: {
  role: AppRole | string;
  opcoId: bigint | null | undefined;
  partnerId: bigint | null | undefined;
}): Promise<boolean> {
  const role = params.role;

  if (role === "opco") {
    if (!params.opcoId) {
      return false;
    }
    const opco = await prisma.opco.findFirst({
      where: { id: params.opcoId, isDeleted: false },
      select: { status: { select: { code: true } } },
    });
    return opco?.status.code === "ACTIVE";
  }

  if (role === "partner") {
    if (!params.partnerId) {
      return false;
    }
    const partner = await prisma.partner.findFirst({
      where: { id: params.partnerId, isDeleted: false },
      select: { status: { select: { code: true } } },
    });
    return partner?.status.code === "ACTIVE";
  }

  // admin / client — no org gate
  return true;
}

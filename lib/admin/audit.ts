import type { Prisma } from "@prisma/client";

import { getLookupId } from "@/lib/admin/lookups";
import { prisma } from "@/lib/prisma";

type UserAuditAction = "USER_CREATED" | "USER_UPDATED" | "USER_DELETED";

export async function writeUserAuditLog(params: {
  actorUserId: bigint;
  action: UserAuditAction;
  userId: bigint;
  message: string;
  metadata?: Prisma.InputJsonValue;
}): Promise<void> {
  const [actionId, entityTypeId] = await Promise.all([
    getLookupId("AUDIT_ACTION", params.action),
    getLookupId("AUDIT_ENTITY_TYPE", "USER"),
  ]);

  await prisma.auditLog.create({
    data: {
      actorUserId: params.actorUserId,
      actionId,
      entityTypeId,
      entityId: params.userId,
      message: params.message,
      metadata: params.metadata ?? undefined,
    },
  });
}

import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

async function getLookupId(typeCode: string, code: string): Promise<number> {
  const lookup = await prisma.lookup.findFirst({
    where: {
      code,
      lookupType: { code: typeCode },
    },
    select: { id: true },
  });

  if (!lookup) {
    throw new Error(`Lookup not found: ${typeCode}.${code}`);
  }

  return lookup.id;
}

export async function writePlatformAuditLog(params: {
  actorUserId: bigint;
  action: string;
  entityType: string;
  entityId: bigint;
  message: string;
  metadata?: Prisma.InputJsonValue;
}): Promise<void> {
  try {
    const [actionId, entityTypeId] = await Promise.all([
      getLookupId("AUDIT_ACTION", params.action),
      getLookupId("AUDIT_ENTITY_TYPE", params.entityType),
    ]);

    await prisma.auditLog.create({
      data: {
        actorUserId: params.actorUserId,
        actionId,
        entityTypeId,
        entityId: params.entityId,
        message: params.message,
        metadata: params.metadata ?? undefined,
      },
    });
  } catch (error) {
    console.error("Failed to write platform audit log", error);
  }
}

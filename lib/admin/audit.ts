import type { Prisma } from "@prisma/client";

import { getLookupId } from "@/lib/admin/lookups";
import { prisma } from "@/lib/prisma";

type UserAuditAction = "USER_CREATED" | "USER_UPDATED" | "USER_DELETED";

type SettingsAuditAction =
  | "SETTINGS_EMAIL_UPDATED"
  | "EMAIL_TEST_SENT"
  | "SETTINGS_REMINDERS_UPDATED"
  | "SETTINGS_OPCO_PARTNER_LINK_UPDATED"
  | "SETTINGS_TOLERANCE_UPDATED";

type CurrencyAuditAction =
  | "CURRENCY_CREATED"
  | "CURRENCY_UPDATED"
  | "CURRENCY_DELETED"
  | "CURRENCY_RATE_UPDATED";

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

export async function writeSettingsAuditLog(params: {
  actorUserId: bigint;
  action: SettingsAuditAction;
  message: string;
  metadata?: Prisma.InputJsonValue;
}): Promise<void> {
  const [actionId, entityTypeId] = await Promise.all([
    getLookupId("AUDIT_ACTION", params.action),
    getLookupId("AUDIT_ENTITY_TYPE", "SETTINGS"),
  ]);

  await prisma.auditLog.create({
    data: {
      actorUserId: params.actorUserId,
      actionId,
      entityTypeId,
      entityId: BigInt(1),
      message: params.message,
      metadata: params.metadata ?? undefined,
    },
  });
}

export async function writeCurrencyAuditLog(params: {
  actorUserId: bigint;
  action: CurrencyAuditAction;
  currencyId: bigint;
  message: string;
  metadata?: Prisma.InputJsonValue;
}): Promise<void> {
  const [actionId, entityTypeId] = await Promise.all([
    getLookupId("AUDIT_ACTION", params.action),
    getLookupId("AUDIT_ENTITY_TYPE", "CURRENCY"),
  ]);

  await prisma.auditLog.create({
    data: {
      actorUserId: params.actorUserId,
      actionId,
      entityTypeId,
      entityId: params.currencyId,
      message: params.message,
      metadata: params.metadata ?? undefined,
    },
  });
}

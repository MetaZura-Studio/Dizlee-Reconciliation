import type { Prisma } from "@prisma/client";

import {
  parseDateBoundary,
  type AuditLogFilterOptions,
  type AuditLogListFilters,
  type AuditLogListItem,
  type AuditLogListResult,
} from "@/lib/admin/audit-logs.shared";
import { prisma } from "@/lib/prisma";

export type {
  AuditLogActorRole,
  AuditLogFilterOptions,
  AuditLogListFilters,
  AuditLogListItem,
  AuditLogListResult,
} from "@/lib/admin/audit-logs.shared";

export {
  buildAuditLogCsv,
  buildAuditLogQuery,
  parseAuditLogListFilters,
} from "@/lib/admin/audit-logs.shared";

export const AUDIT_LOG_EXPORT_LIMIT = 10_000;

function mapAuditLogRow(row: {
  id: bigint;
  entityId: bigint;
  message: string | null;
  createdAt: Date;
  actorUser: {
    name: string | null;
    email: string;
    role: { code: string; label: string };
  };
  action: { code: string; label: string };
  entityType: { code: string; label: string };
}): AuditLogListItem {
  return {
    id: row.id.toString(),
    createdAt: row.createdAt.toISOString(),
    actorName: row.actorUser.name?.trim() || "—",
    actorEmail: row.actorUser.email,
    actorRole: row.actorUser.role.code,
    actionCode: row.action.code,
    actionLabel: row.action.label,
    entityTypeCode: row.entityType.code,
    entityTypeLabel: row.entityType.label,
    entityId: row.entityId.toString(),
    message: row.message,
  };
}

function buildAuditLogWhere(filters: AuditLogListFilters): Prisma.AuditLogWhereInput {
  const where: Prisma.AuditLogWhereInput = {};

  if (filters.search.trim()) {
    where.message = { contains: filters.search.trim() };
  }

  if (filters.entityType !== "all") {
    where.entityType = {
      code: filters.entityType,
      lookupType: { code: "AUDIT_ENTITY_TYPE" },
    };
  }

  if (filters.action !== "all") {
    where.action = {
      code: filters.action,
      lookupType: { code: "AUDIT_ACTION" },
    };
  }

  if (filters.actorRole !== "all") {
    where.actorUser = {
      role: {
        code: filters.actorRole,
        lookupType: { code: "USER_ROLE" },
      },
    };
  }

  if (filters.entityId.trim()) {
    try {
      where.entityId = BigInt(filters.entityId.trim());
    } catch {
      where.entityId = BigInt(-1);
    }
  }

  const dateFrom = parseDateBoundary(filters.dateFrom, "start");
  const dateTo = parseDateBoundary(filters.dateTo, "end");

  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) {
      where.createdAt.gte = dateFrom;
    }
    if (dateTo) {
      where.createdAt.lte = dateTo;
    }
  }

  return where;
}

const auditLogInclude = {
  actorUser: {
    select: {
      name: true,
      email: true,
      role: { select: { code: true, label: true } },
    },
  },
  action: { select: { code: true, label: true } },
  entityType: { select: { code: true, label: true } },
} as const;

export async function getAuditLogFilterOptions(): Promise<AuditLogFilterOptions> {
  const [entityTypes, actions, actorRoles] = await Promise.all([
    prisma.lookup.findMany({
      where: { lookupType: { code: "AUDIT_ENTITY_TYPE" } },
      orderBy: { code: "asc" },
      select: { code: true, label: true },
    }),
    prisma.lookup.findMany({
      where: { lookupType: { code: "AUDIT_ACTION" } },
      orderBy: { code: "asc" },
      select: { code: true, label: true },
    }),
    prisma.lookup.findMany({
      where: { lookupType: { code: "USER_ROLE" } },
      orderBy: { code: "asc" },
      select: { code: true, label: true },
    }),
  ]);

  return {
    entityTypes,
    actions,
    actorRoles: actorRoles.map((role) => ({
      code: role.code as AuditLogFilterOptions["actorRoles"][number]["code"],
      label: role.label,
    })),
  };
}

export async function listAuditLogs(
  filters: AuditLogListFilters,
): Promise<AuditLogListResult> {
  const where = buildAuditLogWhere(filters);
  const skip = (filters.page - 1) * filters.pageSize;

  const [total, rows] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      include: auditLogInclude,
      orderBy: { createdAt: "desc" },
      skip,
      take: filters.pageSize,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / filters.pageSize));

  return {
    items: rows.map(mapAuditLogRow),
    total,
    page: filters.page,
    pageSize: filters.pageSize,
    totalPages,
    filters,
  };
}

export async function listAuditLogsForExport(
  filters: AuditLogListFilters,
  limit = AUDIT_LOG_EXPORT_LIMIT,
): Promise<AuditLogListItem[]> {
  const where = buildAuditLogWhere(filters);
  const rows = await prisma.auditLog.findMany({
    where,
    include: auditLogInclude,
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return rows.map(mapAuditLogRow);
}

/**
 * Admin dashboard aggregates — entity counts, role breakdown, recent audit activity.
 * Read-only; excludes soft-deleted rows and uses ACTIVE status where applicable.
 */
import type { AuditLogListItem } from "@/lib/admin/audit-logs.shared";
import { prisma } from "@/lib/prisma";

export type AdminEntityCounts = {
  total: number;
  active: number;
};

export type AdminUserRoleCounts = {
  admin: number;
  client: number;
  opco: number;
  partner: number;
};

export type AdminDashboardData = {
  opcos: AdminEntityCounts;
  partners: AdminEntityCounts;
  users: AdminEntityCounts;
  usersByRole: AdminUserRoleCounts;
  opcoPartnerLinks: number;
  currencies: number;
  recentActivity: AuditLogListItem[];
};

const notDeleted = { isDeleted: false } as const;

const activeEntityStatus = {
  isDeleted: false,
  status: { code: "ACTIVE" },
} as const;

const activeUserStatus = {
  isDeleted: false,
  status: {
    code: "ACTIVE",
    lookupType: { code: "USER_STATUS" },
  },
} as const;

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

async function countUsersByRole(roleCode: string): Promise<number> {
  return prisma.user.count({
    where: {
      ...notDeleted,
      role: {
        code: roleCode,
        lookupType: { code: "USER_ROLE" },
      },
    },
  });
}

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  const [
    opcoTotal,
    opcoActive,
    partnerTotal,
    partnerActive,
    userTotal,
    userActive,
    adminUsers,
    clientUsers,
    opcoUsers,
    partnerUsers,
    opcoPartnerLinks,
    currencies,
    recentRows,
  ] = await Promise.all([
    prisma.opco.count({ where: notDeleted }),
    prisma.opco.count({ where: activeEntityStatus }),
    prisma.partner.count({ where: notDeleted }),
    prisma.partner.count({ where: activeEntityStatus }),
    prisma.user.count({ where: notDeleted }),
    prisma.user.count({ where: activeUserStatus }),
    countUsersByRole("ADMIN"),
    countUsersByRole("CLIENT"),
    countUsersByRole("OPCO"),
    countUsersByRole("PARTNER"),
    prisma.opcoPartnerLink.count({ where: notDeleted }),
    prisma.currency.count({ where: notDeleted }),
    prisma.auditLog.findMany({
      include: auditLogInclude,
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  return {
    opcos: { total: opcoTotal, active: opcoActive },
    partners: { total: partnerTotal, active: partnerActive },
    users: { total: userTotal, active: userActive },
    usersByRole: {
      admin: adminUsers,
      client: clientUsers,
      opco: opcoUsers,
      partner: partnerUsers,
    },
    opcoPartnerLinks,
    currencies,
    recentActivity: recentRows.map(mapAuditLogRow),
  };
}

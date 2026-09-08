/**
 * Admin email delivery log query — paginated SMTP handoff attempts.
 */

import type { Prisma } from "@prisma/client";

import {
  parseDateBoundary,
  type EmailDeliveryListFilters,
  type EmailDeliveryListItem,
  type EmailDeliveryListResult,
  type EmailDeliverySortDirection,
  type EmailDeliverySortField,
} from "@/lib/admin/email-delivery.shared";
import { prisma } from "@/lib/prisma";

export type {
  EmailDeliveryFilterOptions,
  EmailDeliveryListFilters,
  EmailDeliveryListItem,
  EmailDeliveryListResult,
} from "@/lib/admin/email-delivery.shared";

export {
  buildEmailDeliveryQuery,
  emailDeliveryPurposeLabel,
  emailDeliveryStatusLabel,
  getEmailDeliveryFilterOptions,
  parseEmailDeliveryListFilters,
} from "@/lib/admin/email-delivery.shared";

function buildOrderBy(
  sortBy: EmailDeliverySortField,
  sortDir: EmailDeliverySortDirection,
): Prisma.EmailDeliveryOrderByWithRelationInput {
  switch (sortBy) {
    case "status":
      return { status: sortDir };
    case "purpose":
      return { purpose: sortDir };
    case "toEmail":
      return { toEmail: sortDir };
    case "createdAt":
    default:
      return { createdAt: sortDir };
  }
}

function mapRow(row: {
  id: bigint;
  createdAt: Date;
  toEmail: string;
  originalToEmail: string | null;
  fromEmail: string | null;
  subject: string;
  purpose: string;
  status: string;
  skipReason: string | null;
  providerMessageId: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  notificationId: bigint | null;
  correlationId: string | null;
  actorUser: { email: string } | null;
}): EmailDeliveryListItem {
  return {
    id: row.id.toString(),
    createdAt: row.createdAt.toISOString(),
    toEmail: row.toEmail,
    originalToEmail: row.originalToEmail,
    fromEmail: row.fromEmail,
    subject: row.subject,
    purpose: row.purpose,
    status: row.status,
    skipReason: row.skipReason,
    providerMessageId: row.providerMessageId,
    errorCode: row.errorCode,
    errorMessage: row.errorMessage,
    notificationId: row.notificationId?.toString() ?? null,
    correlationId: row.correlationId,
    actorEmail: row.actorUser?.email ?? null,
  };
}

function buildWhere(
  filters: EmailDeliveryListFilters,
): Prisma.EmailDeliveryWhereInput {
  const where: Prisma.EmailDeliveryWhereInput = {};

  if (filters.search.trim()) {
    const term = filters.search.trim();
    where.OR = [
      { toEmail: { contains: term } },
      { originalToEmail: { contains: term } },
      { subject: { contains: term } },
      { errorCode: { contains: term } },
      { errorMessage: { contains: term } },
      { providerMessageId: { contains: term } },
      { correlationId: { contains: term } },
    ];
  }

  if (filters.status !== "all") {
    where.status = filters.status;
  }

  if (filters.purpose !== "all") {
    where.purpose = filters.purpose;
  }

  const dateFrom = parseDateBoundary(filters.dateFrom, "start");
  const dateTo = parseDateBoundary(filters.dateTo, "end");
  if (dateFrom || dateTo) {
    where.createdAt = {
      ...(dateFrom ? { gte: dateFrom } : {}),
      ...(dateTo ? { lte: dateTo } : {}),
    };
  }

  return where;
}

export async function listEmailDeliveries(
  filters: EmailDeliveryListFilters,
): Promise<EmailDeliveryListResult> {
  const where = buildWhere(filters);
  const skip = (filters.page - 1) * filters.pageSize;

  const [total, rows] = await Promise.all([
    prisma.emailDelivery.count({ where }),
    prisma.emailDelivery.findMany({
      where,
      orderBy: buildOrderBy(filters.sortBy, filters.sortDir),
      skip,
      take: filters.pageSize,
      include: {
        actorUser: { select: { email: true } },
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / filters.pageSize));

  return {
    items: rows.map(mapRow),
    total,
    page: filters.page,
    pageSize: filters.pageSize,
    totalPages,
    filters,
  };
}

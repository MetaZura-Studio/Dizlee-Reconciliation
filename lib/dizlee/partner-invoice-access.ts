/**
 * Dizlee control of Partner → Dizlee invoice upload access (per Partner toggle).
 */

import "server-only";

import { DomainError } from "@/lib/errors/app-error";
import { sendBroadcastNotification } from "@/lib/dizlee/notifications/intimations";
import type {
  BulkPartnerInvoiceAccessResult,
  PartnerInvoiceAccessFilters,
  PartnerInvoiceAccessItem,
  PartnerInvoiceAccessResult,
  PartnerInvoiceAccessStatusFilter,
} from "@/lib/dizlee/partner-invoice-access.shared";
import {
  PARTNER_INVOICE_ACCESS_PAGE_SIZE,
  parsePartnerInvoiceAccessFilters,
} from "@/lib/dizlee/partner-invoice-access.shared";
import { writePlatformAuditLog } from "@/lib/platform/audit-log";
import { formatAppDateTime } from "@/lib/platform/format-datetime";
import { getCurrentPeriod } from "@/lib/platform/period";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export type {
  BulkPartnerInvoiceAccessResult,
  PartnerInvoiceAccessFilters,
  PartnerInvoiceAccessItem,
  PartnerInvoiceAccessResult,
  PartnerInvoiceAccessStatusFilter,
} from "@/lib/dizlee/partner-invoice-access.shared";
export {
  PARTNER_INVOICE_ACCESS_PAGE_SIZE,
  parsePartnerInvoiceAccessFilters,
} from "@/lib/dizlee/partner-invoice-access.shared";

export const PARTNER_INVOICE_UPLOAD_OPEN_TEMPLATE_CODE =
  "PARTNER_INVOICE_UPLOAD_OPEN";

export class PartnerInvoiceAccessError extends DomainError {
  constructor(keyOrMessage: string, status?: number) {
    super("PartnerInvoiceAccessError", keyOrMessage, status);
  }
}

function mapPartnerRow(row: {
  id: bigint;
  name: string;
  invoiceUploadEnabled: boolean;
  updatedAt: Date;
}): PartnerInvoiceAccessItem {
  return {
    id: row.id.toString(),
    name: row.name,
    invoiceUploadEnabled: row.invoiceUploadEnabled,
    updatedAt: row.updatedAt.toISOString(),
    updatedAtLabel: formatAppDateTime(row.updatedAt),
  };
}

function partnerAccessWhere(params: {
  search?: string;
  status?: PartnerInvoiceAccessStatusFilter;
}): Prisma.PartnerWhereInput {
  const search = params.search?.trim() || undefined;
  const status = params.status ?? "all";
  return {
    isDeleted: false,
    ...(search ? { name: { contains: search } } : {}),
    ...(status === "open"
      ? { invoiceUploadEnabled: true }
      : status === "closed"
        ? { invoiceUploadEnabled: false }
        : {}),
  };
}

export async function listPartnerInvoiceAccess(
  filters: PartnerInvoiceAccessFilters = {
    page: 1,
    status: "all",
    sortBy: "name",
    sortDir: "asc",
  },
): Promise<PartnerInvoiceAccessResult> {
  const pageSize = PARTNER_INVOICE_ACCESS_PAGE_SIZE;
  const search = filters.search?.trim() || undefined;
  const status = filters.status ?? "all";
  const sortBy = filters.sortBy ?? "name";
  const sortDir = filters.sortDir ?? (sortBy === "updatedAt" ? "desc" : "asc");

  const where = partnerAccessWhere({ search, status });

  const totalCount = await prisma.partner.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const page = Math.min(Math.max(1, filters.page), totalPages);

  const rows = await prisma.partner.findMany({
    where,
    select: {
      id: true,
      name: true,
      invoiceUploadEnabled: true,
      updatedAt: true,
    },
    orderBy:
      sortBy === "updatedAt"
        ? [{ updatedAt: sortDir }, { name: "asc" }]
        : [{ name: sortDir }, { id: "asc" }],
    skip: (page - 1) * pageSize,
    take: pageSize,
  });

  return {
    items: rows.map(mapPartnerRow),
    page,
    pageSize,
    totalPages,
    totalCount,
    filters: { search, status, sortBy, sortDir, page },
  };
}

/**
 * Set invoice upload gate. Notifies the Partner only on false → true.
 * No-op (no notify, no audit) when value is unchanged.
 */
export async function setPartnerInvoiceUploadEnabled(params: {
  partnerId: string;
  enabled: boolean;
  actorUserId: string;
}): Promise<PartnerInvoiceAccessItem> {
  if (!/^\d+$/.test(params.partnerId)) {
    throw new PartnerInvoiceAccessError("Partner not found", 404);
  }

  const partnerId = BigInt(params.partnerId);
  const actorUserId = BigInt(params.actorUserId);

  const existing = await prisma.partner.findFirst({
    where: { id: partnerId, isDeleted: false },
    select: {
      id: true,
      name: true,
      invoiceUploadEnabled: true,
      updatedAt: true,
    },
  });

  if (!existing) {
    throw new PartnerInvoiceAccessError("Partner not found", 404);
  }

  if (existing.invoiceUploadEnabled === params.enabled) {
    return {
      id: existing.id.toString(),
      name: existing.name,
      invoiceUploadEnabled: existing.invoiceUploadEnabled,
      updatedAt: existing.updatedAt.toISOString(),
      updatedAtLabel: formatAppDateTime(existing.updatedAt),
    };
  }

  const updated = await prisma.partner.update({
    where: { id: partnerId },
    data: {
      invoiceUploadEnabled: params.enabled,
      updatedByUserId: actorUserId,
    },
    select: {
      id: true,
      name: true,
      invoiceUploadEnabled: true,
      updatedAt: true,
    },
  });

  await writePlatformAuditLog({
    actorUserId,
    action: "PARTNER_UPDATED",
    entityType: "PARTNER",
    entityId: partnerId,
    message: params.enabled
      ? `Invoice upload enabled for Partner ${updated.name}`
      : `Invoice upload disabled for Partner ${updated.name}`,
    metadata: {
      invoiceUploadEnabled: params.enabled,
      previousInvoiceUploadEnabled: existing.invoiceUploadEnabled,
      name: updated.name,
    },
  });

  // Inbox notification is awaited; SMTP emails run in the background.
  if (params.enabled) {
    try {
      const period = getCurrentPeriod();
      await sendBroadcastNotification({
        fromUserId: params.actorUserId,
        input: {
          audience: "partner",
          opcoIds: [],
          partnerIds: [params.partnerId],
          messageSource: PARTNER_INVOICE_UPLOAD_OPEN_TEMPLATE_CODE,
          month: period.month,
          year: period.year,
          deliveryChannel: "BOTH",
          requireEmailConfigured: false,
          priority: "NORMAL",
        },
        deferEmail: true,
      });
    } catch (error) {
      console.error(
        "[partner-invoice-access] Failed to notify Partner after enabling invoice upload:",
        error,
      );
    }
  }

  return {
    id: updated.id.toString(),
    name: updated.name,
    invoiceUploadEnabled: updated.invoiceUploadEnabled,
    updatedAt: updated.updatedAt.toISOString(),
    updatedAtLabel: formatAppDateTime(updated.updatedAt),
  };
}

/**
 * Open or close invoice upload for all non-deleted Partners matching the
 * current list filters (search + status). Notifies only Partners that flip
 * closed → open.
 */
export async function bulkSetPartnerInvoiceUploadEnabled(params: {
  enabled: boolean;
  search?: string;
  status?: PartnerInvoiceAccessStatusFilter;
  actorUserId: string;
}): Promise<BulkPartnerInvoiceAccessResult> {
  const actorUserId = BigInt(params.actorUserId);
  const where = partnerAccessWhere({
    search: params.search,
    status: params.status,
  });

  const targets = await prisma.partner.findMany({
    where: {
      ...where,
      invoiceUploadEnabled: !params.enabled,
    },
    select: { id: true, name: true },
  });

  if (targets.length === 0) {
    return { enabled: params.enabled, updatedCount: 0, notifiedCount: 0 };
  }

  const ids = targets.map((row) => row.id);

  await prisma.partner.updateMany({
    where: { id: { in: ids }, isDeleted: false },
    data: {
      invoiceUploadEnabled: params.enabled,
      updatedByUserId: actorUserId,
    },
  });

  await writePlatformAuditLog({
    actorUserId,
    action: "PARTNER_UPDATED",
    entityType: "PARTNER",
    entityId: ids[0]!,
    message: params.enabled
      ? `Invoice upload enabled for ${ids.length} Partner(s)`
      : `Invoice upload disabled for ${ids.length} Partner(s)`,
    metadata: {
      bulkInvoiceUploadEnabled: params.enabled,
      updatedPartnerIds: ids.map((id) => id.toString()),
      updatedCount: ids.length,
      search: params.search ?? null,
      status: params.status ?? "all",
    },
  });

  let notifiedCount = 0;
  if (params.enabled) {
    try {
      const period = getCurrentPeriod();
      await sendBroadcastNotification({
        fromUserId: params.actorUserId,
        input: {
          audience: "partner",
          opcoIds: [],
          partnerIds: ids.map((id) => id.toString()),
          messageSource: PARTNER_INVOICE_UPLOAD_OPEN_TEMPLATE_CODE,
          month: period.month,
          year: period.year,
          deliveryChannel: "BOTH",
          requireEmailConfigured: false,
          priority: "NORMAL",
        },
        deferEmail: true,
      });
      notifiedCount = ids.length;
    } catch (error) {
      console.error(
        "[partner-invoice-access] Failed to notify Partners after bulk enable:",
        error,
      );
    }
  }

  return {
    enabled: params.enabled,
    updatedCount: ids.length,
    notifiedCount,
  };
}

export {
  filterPartnerIdsWithInvoiceUploadEnabled,
  getPartnerInvoiceUploadEnabled,
} from "@/lib/platform/partner-invoice-upload-access";

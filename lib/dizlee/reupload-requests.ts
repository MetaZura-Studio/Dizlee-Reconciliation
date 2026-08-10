/**
 * Report reupload request queue for Dizlee review and OpCo/Partner resubmission.
 * Consumed by reupload requests UI; writes platform audit entries on decisions.
 */

import type { Prisma } from "@prisma/client";

import { currentPeriod, type DashboardPeriod } from "@/lib/dizlee/dashboard";
import { getLookupId } from "@/lib/dizlee/lookups";
import { writePlatformAuditLog } from "@/lib/platform/audit-log";
import {
  getReportFilterOptions,
  type ReportFilterOptions,
} from "@/lib/dizlee/reports";
import { prisma } from "@/lib/prisma";
import { DomainError } from "@/lib/errors/app-error";

export type ReuploadListFilters = {
  month: number;
  year: number;
  opcoId?: string;
  partnerId?: string;
  page: number;
  sortBy: ReuploadSortField;
  sortDir: SortDirection;
};

export type ReuploadSortField = "period" | "opco" | "partner" | "requested";
export type SortDirection = "asc" | "desc";

export type ReuploadRequestItem = {
  id: string;
  reportId: string;
  period: DashboardPeriod;
  opcoName: string;
  partnerName: string;
  filename: string | null;
  requestedBy: string;
  requestedAt: string;
  reason: string | null;
};

export type ReuploadListResult = {
  items: ReuploadRequestItem[];
  page: number;
  pageSize: number;
  totalPages: number;
  totalCount: number;
  filters: ReuploadListFilters;
};

const PAGE_SIZE = 10;

function periodFromParts(month: number, year: number): DashboardPeriod {
  return {
    month,
    year,
    label: new Date(year, month - 1, 1).toLocaleString("en-US", {
      month: "long",
      year: "numeric",
    }),
  };
}

function requesterLabel(roleCode: string | undefined): string {
  switch (roleCode) {
    case "OPCO":
      return "OpCo";
    case "PARTNER":
      return "Partner";
    case "CLIENT":
      return "Dizlee";
    case "ADMIN":
      return "Admin";
    default:
      return "Unknown";
  }
}

export function parseReuploadListFilters(
  searchParams: URLSearchParams,
): ReuploadListFilters {
  const fallback = currentPeriod();
  const month = Number(searchParams.get("month"));
  const year = Number(searchParams.get("year"));
  const page = Number(searchParams.get("page"));
  const sortBy = searchParams.get("sortBy");
  const sortDir = searchParams.get("sortDir");

  return {
    month:
      Number.isInteger(month) && month >= 1 && month <= 12 ? month : fallback.month,
    year:
      Number.isInteger(year) && year >= 2000 && year <= 2100 ? year : fallback.year,
    opcoId: searchParams.get("opcoId") ?? undefined,
    partnerId: searchParams.get("partnerId") ?? undefined,
    page: Number.isInteger(page) && page >= 1 ? page : 1,
    sortBy:
      sortBy === "period" ||
      sortBy === "opco" ||
      sortBy === "partner" ||
      sortBy === "requested"
        ? sortBy
        : "requested",
    sortDir: sortDir === "asc" ? "asc" : "desc",
  };
}

function buildReportWhere(filters: ReuploadListFilters): Prisma.ReportWhereInput {
  const where: Prisma.ReportWhereInput = {
    month: filters.month,
    year: filters.year,
  };

  if (filters.opcoId) {
    where.opcoId = BigInt(filters.opcoId);
  }
  if (filters.partnerId) {
    where.partnerId = BigInt(filters.partnerId);
  }

  return where;
}

export async function listPendingReuploadRequests(
  filters: ReuploadListFilters,
): Promise<ReuploadListResult> {
  const where: Prisma.ReportChangeRequestWhereInput = {
    decidedAt: null,
    report: buildReportWhere(filters),
  };

  const [totalCount, rows] = await Promise.all([
    prisma.reportChangeRequest.count({ where }),
    prisma.reportChangeRequest.findMany({
      where,
      orderBy: (() => {
        switch (filters.sortBy) {
          case "period":
            return [
              { report: { year: filters.sortDir } },
              { report: { month: filters.sortDir } },
              { createdAt: "desc" as const },
            ];
          case "opco":
            return { report: { opco: { name: filters.sortDir } } };
          case "partner":
            return { report: { partner: { name: filters.sortDir } } };
          case "requested":
          default:
            return { createdAt: filters.sortDir };
        }
      })(),
      skip: (filters.page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        report: {
          include: {
            opco: { select: { name: true } },
            partner: { select: { name: true } },
            file: { select: { filename: true } },
          },
        },
        requestedBy: { select: { role: { select: { code: true } } } },
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return {
    items: rows.map((row) => ({
      id: row.id.toString(),
      reportId: row.reportId.toString(),
      period: periodFromParts(row.report.month, row.report.year),
      opcoName: row.report.opco.name,
      partnerName: row.report.partner.name,
      filename: row.report.file?.filename ?? null,
      requestedBy: requesterLabel(row.requestedBy.role?.code),
      requestedAt: row.createdAt.toISOString(),
      reason: row.reason,
    })),
    page: filters.page,
    pageSize: PAGE_SIZE,
    totalPages,
    totalCount,
    filters,
  };
}

export class ReuploadRequestError extends DomainError {
  constructor(keyOrMessage: string, status?: number) {
    super("ReuploadRequestError", keyOrMessage, status);
  }
}

export async function approveReuploadRequest(
  requestId: string,
  decidedByUserId: string,
): Promise<void> {
  const [approvedStatusId, changeRequestedStatusId] = await Promise.all([
    getLookupId("REPORT_STATUS", "APPROVED"),
    getLookupId("REPORT_STATUS", "CHANGE_REQUESTED"),
  ]);

  const request = await prisma.reportChangeRequest.findFirst({
    where: { id: BigInt(requestId), decidedAt: null },
    include: {
      report: {
        include: {
          opco: { select: { name: true } },
          partner: { select: { name: true } },
        },
      },
    },
  });

  if (!request) {
    throw new ReuploadRequestError("Reupload request not found", 404);
  }

  const deciderId = BigInt(decidedByUserId);
  const decidedAt = new Date();

  const updated = await prisma.reportChangeRequest.updateMany({
    where: { id: request.id, decidedAt: null },
    data: {
      statusId: approvedStatusId,
      decidedByUserId: deciderId,
      decidedAt,
    },
  });

  if (updated.count === 0) {
    throw new ReuploadRequestError("Reupload request not found", 404);
  }

  await prisma.report.update({
    where: { id: request.reportId },
    data: { statusId: changeRequestedStatusId },
  });

  const periodLabel = periodFromParts(
    request.report.month,
    request.report.year,
  ).label;

  await notifyRequester({
    requesterUserId: request.requestedByUserId,
    fromUserId: deciderId,
    subject: "Reupload request approved",
    body: `Your reupload request for ${request.report.opco.name} / ${request.report.partner.name} (${periodLabel}) was approved. You may upload a corrected report file.`,
  });

  await writePlatformAuditLog({
    actorUserId: deciderId,
    action: "REPORT_CHANGE_REQUESTED",
    entityType: "REPORT",
    entityId: request.reportId,
    message: `Dizlee approved report reupload for ${request.report.opco.name} / ${request.report.partner.name} (${periodLabel})`,
    metadata: {
      changeRequestId: request.id.toString(),
      decision: "approved",
    },
  });
}

export async function rejectReuploadRequest(
  requestId: string,
  decidedByUserId: string,
  decisionNote?: string,
): Promise<void> {
  const submittedStatusId = await getLookupId("REPORT_STATUS", "SUBMITTED");

  const request = await prisma.reportChangeRequest.findFirst({
    where: { id: BigInt(requestId), decidedAt: null },
    include: {
      report: {
        include: {
          opco: { select: { name: true } },
          partner: { select: { name: true } },
        },
      },
    },
  });

  if (!request) {
    throw new ReuploadRequestError("Reupload request not found", 404);
  }

  const deciderId = BigInt(decidedByUserId);
  const decidedAt = new Date();
  const trimmedNote = decisionNote?.trim() || null;

  const updated = await prisma.reportChangeRequest.updateMany({
    where: { id: request.id, decidedAt: null },
    data: {
      statusId: submittedStatusId,
      decidedByUserId: deciderId,
      decidedAt,
      decisionNote: trimmedNote,
    },
  });

  if (updated.count === 0) {
    throw new ReuploadRequestError("Reupload request not found", 404);
  }

  await prisma.report.update({
    where: { id: request.reportId },
    data: { statusId: submittedStatusId },
  });

  const periodLabel = periodFromParts(
    request.report.month,
    request.report.year,
  ).label;
  const noteSuffix = trimmedNote ? ` Note: ${trimmedNote}` : "";

  await notifyRequester({
    requesterUserId: request.requestedByUserId,
    fromUserId: deciderId,
    subject: "Reupload request rejected",
    body: `Your reupload request for ${request.report.opco.name} / ${request.report.partner.name} (${periodLabel}) was rejected.${noteSuffix}`,
  });

  await writePlatformAuditLog({
    actorUserId: deciderId,
    action: "REPORT_CHANGE_REQUESTED",
    entityType: "REPORT",
    entityId: request.reportId,
    message: `Dizlee rejected report reupload for ${request.report.opco.name} / ${request.report.partner.name} (${periodLabel})`,
    metadata: {
      changeRequestId: request.id.toString(),
      decision: "rejected",
      decisionNote: trimmedNote,
    },
  });
}

async function notifyRequester(params: {
  requesterUserId: bigint;
  fromUserId: bigint;
  subject: string;
  body: string;
}): Promise<void> {
  const [sentStatusId, userRecipientTypeId] = await Promise.all([
    getLookupId("NOTIFICATION_STATUS", "SENT"),
    getLookupId("RECIPIENT_TYPE", "USER"),
  ]);

  await prisma.notification.create({
    data: {
      subject: params.subject,
      body: params.body,
      statusId: sentStatusId,
      sentAt: new Date(),
      createdByUserId: params.fromUserId,
      recipients: {
        create: {
          recipientTypeId: userRecipientTypeId,
          recipientId: params.requesterUserId,
          fromUserId: params.fromUserId,
        },
      },
    },
  });
}

export { getReportFilterOptions, type ReportFilterOptions, PAGE_SIZE as REUPLOAD_PAGE_SIZE };

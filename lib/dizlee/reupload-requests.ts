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

export type ReuploadDecisionStatus = "PENDING" | "APPROVED" | "REJECTED";

export type ReuploadRequestItem = {
  id: string;
  /** `report` = Partner (or legacy) per-report CR; `submission` = OpCo monthly file CR */
  kind: "report" | "submission";
  reportId: string;
  period: DashboardPeriod;
  opcoName: string;
  partnerName: string;
  filename: string | null;
  requestedBy: string;
  requestedAt: string;
  reason: string | null;
  decisionStatus: ReuploadDecisionStatus;
  decisionLabel: string;
  decidedAt: string | null;
  decisionNote: string | null;
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

function mapDecisionFields(row: {
  decidedAt: Date | null;
  decisionNote: string | null;
  status: { code: string };
}): Pick<
  ReuploadRequestItem,
  "decisionStatus" | "decisionLabel" | "decidedAt" | "decisionNote"
> {
  if (row.decidedAt == null) {
    return {
      decisionStatus: "PENDING",
      decisionLabel: "Pending",
      decidedAt: null,
      decisionNote: row.decisionNote,
    };
  }

  if (row.status.code === "APPROVED") {
    return {
      decisionStatus: "APPROVED",
      decisionLabel: "Approved",
      decidedAt: row.decidedAt.toISOString(),
      decisionNote: row.decisionNote,
    };
  }

  // Reject path stores REPORT_STATUS.SUBMITTED on the change request.
  return {
    decisionStatus: "REJECTED",
    decisionLabel: "Rejected",
    decidedAt: row.decidedAt.toISOString(),
    decisionNote: row.decisionNote,
  };
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
    // Partner per-report reuploads only (OpCo uses monthly submissions).
    version: 2,
  };

  if (filters.opcoId) {
    where.opcoId = BigInt(filters.opcoId);
  }
  if (filters.partnerId) {
    where.partnerId = BigInt(filters.partnerId);
  }

  return where;
}

function buildSubmissionWhere(
  filters: ReuploadListFilters,
): Prisma.OpcoReportSubmissionWhereInput {
  const where: Prisma.OpcoReportSubmissionWhereInput = {
    month: filters.month,
    year: filters.year,
    isDeleted: false,
  };

  if (filters.opcoId) {
    where.opcoId = BigInt(filters.opcoId);
  }

  return where;
}

export async function listReuploadRequests(
  filters: ReuploadListFilters,
): Promise<ReuploadListResult> {
  const partnerWhere: Prisma.ReportChangeRequestWhereInput = {
    report: buildReportWhere(filters),
  };

  const submissionWhere: Prisma.OpcoSubmissionChangeRequestWhereInput = {
    submission: buildSubmissionWhere(filters),
  };

  // Partner filter excludes OpCo monthly requests (no single partner).
  const includeSubmissions = !filters.partnerId;

  const [partnerRows, submissionRows] = await Promise.all([
    prisma.reportChangeRequest.findMany({
      where: partnerWhere,
      include: {
        report: {
          include: {
            opco: { select: { name: true } },
            partner: { select: { name: true } },
            file: { select: { filename: true } },
          },
        },
        requestedBy: { select: { role: { select: { code: true } } } },
        status: { select: { code: true } },
      },
    }),
    includeSubmissions
      ? prisma.opcoSubmissionChangeRequest.findMany({
          where: submissionWhere,
          include: {
            submission: {
              include: {
                opco: { select: { name: true } },
                file: { select: { filename: true } },
              },
            },
            requestedBy: { select: { role: { select: { code: true } } } },
            status: { select: { code: true } },
          },
        })
      : Promise.resolve([]),
  ]);

  const items: ReuploadRequestItem[] = [
    ...partnerRows.map((row) => ({
      id: row.id.toString(),
      kind: "report" as const,
      reportId: row.reportId.toString(),
      period: periodFromParts(row.report.month, row.report.year),
      opcoName: row.report.opco.name,
      partnerName: row.report.partner.name,
      filename: row.report.file?.filename ?? null,
      requestedBy: requesterLabel(row.requestedBy.role?.code),
      requestedAt: row.createdAt.toISOString(),
      reason: row.reason,
      ...mapDecisionFields(row),
    })),
    ...submissionRows.map((row) => ({
      id: `submission:${row.id.toString()}`,
      kind: "submission" as const,
      reportId: row.submissionId.toString(),
      period: periodFromParts(row.submission.month, row.submission.year),
      opcoName: row.submission.opco.name,
      partnerName: "All partners",
      filename: row.submission.file?.filename ?? null,
      requestedBy: requesterLabel(row.requestedBy.role?.code),
      requestedAt: row.createdAt.toISOString(),
      reason: row.reason,
      ...mapDecisionFields(row),
    })),
  ];

  const dir = filters.sortDir === "asc" ? 1 : -1;
  items.sort((a, b) => {
    const aPending = a.decisionStatus === "PENDING" ? 0 : 1;
    const bPending = b.decisionStatus === "PENDING" ? 0 : 1;
    if (aPending !== bPending) {
      return aPending - bPending;
    }

    switch (filters.sortBy) {
      case "period": {
        const byYear = (a.period.year - b.period.year) * dir;
        if (byYear !== 0) return byYear;
        return (a.period.month - b.period.month) * dir;
      }
      case "opco":
        return a.opcoName.localeCompare(b.opcoName) * dir;
      case "partner":
        return a.partnerName.localeCompare(b.partnerName) * dir;
      case "requested":
      default:
        return (
          (new Date(a.requestedAt).getTime() - new Date(b.requestedAt).getTime()) *
          dir
        );
    }
  });

  const totalCount = items.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const pageItems = items.slice(
    (filters.page - 1) * PAGE_SIZE,
    filters.page * PAGE_SIZE,
  );

  return {
    items: pageItems,
    page: filters.page,
    pageSize: PAGE_SIZE,
    totalPages,
    totalCount,
    filters,
  };
}

/** @deprecated Prefer listReuploadRequests — includes approved/rejected history. */
export const listPendingReuploadRequests = listReuploadRequests;

export class ReuploadRequestError extends DomainError {
  constructor(keyOrMessage: string, status?: number) {
    super("ReuploadRequestError", keyOrMessage, status);
  }
}

export async function approveReuploadRequest(
  requestId: string,
  decidedByUserId: string,
): Promise<void> {
  if (requestId.startsWith("submission:")) {
    await approveOpcoSubmissionReuploadRequest(
      requestId.slice("submission:".length),
      decidedByUserId,
    );
    return;
  }

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

async function approveOpcoSubmissionReuploadRequest(
  changeRequestId: string,
  decidedByUserId: string,
): Promise<void> {
  if (!/^\d+$/.test(changeRequestId)) {
    throw new ReuploadRequestError("Reupload request not found", 404);
  }

  const [approvedStatusId, changeRequestedStatusId] = await Promise.all([
    getLookupId("REPORT_STATUS", "APPROVED"),
    getLookupId("REPORT_STATUS", "CHANGE_REQUESTED"),
  ]);

  const request = await prisma.opcoSubmissionChangeRequest.findFirst({
    where: { id: BigInt(changeRequestId), decidedAt: null },
    include: {
      submission: {
        include: {
          opco: { select: { name: true } },
        },
      },
    },
  });

  if (!request) {
    throw new ReuploadRequestError("Reupload request not found", 404);
  }

  const deciderId = BigInt(decidedByUserId);
  const decidedAt = new Date();

  const updated = await prisma.opcoSubmissionChangeRequest.updateMany({
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

  await prisma.opcoReportSubmission.update({
    where: { id: request.submissionId },
    data: {
      statusId: changeRequestedStatusId,
      updatedByUserId: deciderId,
    },
  });

  const periodLabel = periodFromParts(
    request.submission.month,
    request.submission.year,
  ).label;

  await notifyRequester({
    requesterUserId: request.requestedByUserId,
    fromUserId: deciderId,
    subject: "Reupload request approved",
    body: `Your reupload request for ${request.submission.opco.name} monthly report (${periodLabel}) was approved. You may upload a corrected monthly Excel from Re Upload Report.`,
  });

  await writePlatformAuditLog({
    actorUserId: deciderId,
    action: "REPORT_CHANGE_REQUESTED",
    entityType: "REPORT",
    entityId: request.submissionId,
    message: `Dizlee approved monthly report reupload for ${request.submission.opco.name} (${periodLabel})`,
    metadata: {
      changeRequestId: request.id.toString(),
      submissionId: request.submissionId.toString(),
      decision: "approved",
    },
  });
}

export async function rejectReuploadRequest(
  requestId: string,
  decidedByUserId: string,
  decisionNote?: string,
): Promise<void> {
  if (requestId.startsWith("submission:")) {
    await rejectOpcoSubmissionReuploadRequest(
      requestId.slice("submission:".length),
      decidedByUserId,
      decisionNote,
    );
    return;
  }

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

async function rejectOpcoSubmissionReuploadRequest(
  changeRequestId: string,
  decidedByUserId: string,
  decisionNote?: string,
): Promise<void> {
  if (!/^\d+$/.test(changeRequestId)) {
    throw new ReuploadRequestError("Reupload request not found", 404);
  }

  const submittedStatusId = await getLookupId("REPORT_STATUS", "SUBMITTED");

  const request = await prisma.opcoSubmissionChangeRequest.findFirst({
    where: { id: BigInt(changeRequestId), decidedAt: null },
    include: {
      submission: {
        include: {
          opco: { select: { name: true } },
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

  const updated = await prisma.opcoSubmissionChangeRequest.updateMany({
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

  await prisma.opcoReportSubmission.update({
    where: { id: request.submissionId },
    data: {
      statusId: submittedStatusId,
      updatedByUserId: deciderId,
    },
  });

  const periodLabel = periodFromParts(
    request.submission.month,
    request.submission.year,
  ).label;
  const noteSuffix = trimmedNote ? ` Note: ${trimmedNote}` : "";

  await notifyRequester({
    requesterUserId: request.requestedByUserId,
    fromUserId: deciderId,
    subject: "Reupload request rejected",
    body: `Your reupload request for ${request.submission.opco.name} monthly report (${periodLabel}) was rejected.${noteSuffix}`,
  });

  await writePlatformAuditLog({
    actorUserId: deciderId,
    action: "REPORT_CHANGE_REQUESTED",
    entityType: "REPORT",
    entityId: request.submissionId,
    message: `Dizlee rejected monthly report reupload for ${request.submission.opco.name} (${periodLabel})`,
    metadata: {
      changeRequestId: request.id.toString(),
      submissionId: request.submissionId.toString(),
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

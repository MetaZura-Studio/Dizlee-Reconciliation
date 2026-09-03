/**
 * Partner dashboard aggregates: linked OpCos, submission posture, and recent activity.
 *
 * Portal: Partner. Scoped by `partnerId`; reports use `PARTNER_REPORT_VERSION` only.
 * Submission buckets collapse several workflow codes into dashboard-friendly states.
 */

import { ACTIVE_OPCO_PARTNER_LINK_FILTER } from "@/lib/platform/opco-partner-links";
import { PARTNER_REPORT_VERSION } from "@/lib/platform/reports/sides";
import prisma from "@/lib/prisma";

export type OpcoSubmissionStatus =
  | "submitted"
  | "missing"
  | "change_requested"
  | "pending";

export type OpcoSubmissionSummary = {
  opcoId: string;
  opcoName: string;
  status: OpcoSubmissionStatus;
  reportId: string | null;
  statusLabel: string | null;
  uploadedAt: string | null;
};

export type RecentUploadSummary = {
  reportId: string;
  opcoName: string;
  year: number;
  month: number;
  statusLabel: string;
  uploadedAt: string;
};

export type PartnerDashboardData = {
  year: number;
  month: number;
  partnerName: string;
  linkedOpcos: number;
  submittedCount: number;
  missingCount: number;
  changeRequestedCount: number;
  pendingCount: number;
  /** Whether a partner→client invoice exists for this period. */
  periodInvoiceUploaded: boolean;
  opcoSummaries: OpcoSubmissionSummary[];
  recentUploads: RecentUploadSummary[];
};

/** Maps persisted report status codes to coarse dashboard submission states. */
export function mapReportStatusToSubmissionStatus(
  statusCode: string | undefined,
): OpcoSubmissionStatus {
  if (!statusCode) {
    return "missing";
  }

  switch (statusCode) {
    case "CHANGE_REQUESTED":
      return "change_requested";
    case "PENDING":
      return "pending";
    case "SUBMITTED":
    case "RESUBMITTED":
    case "APPROVED":
      return "submitted";
    default:
      return "pending";
  }
}

function getLatestReportsByOpco<
  T extends { opcoId: bigint; version: number },
>(reports: T[]): Map<string, T> {
  const latestByOpco = new Map<string, T>();

  for (const report of reports) {
    const opcoKey = report.opcoId.toString();
    const existing = latestByOpco.get(opcoKey);

    if (!existing || report.version > existing.version) {
      latestByOpco.set(opcoKey, report);
    }
  }

  return latestByOpco;
}

export async function getPartnerDashboard(
  partnerId: bigint,
  year: number,
  month: number,
): Promise<PartnerDashboardData> {
  const [partner, opcoLinks, periodReports, recentReports, periodInvoices] =
    await Promise.all([
      prisma.partner.findFirst({
        where: { id: partnerId },
        select: { name: true },
      }),
      prisma.opcoPartnerLink.findMany({
        where: { partnerId, ...ACTIVE_OPCO_PARTNER_LINK_FILTER },
        include: {
          opco: {
            select: { id: true, name: true },
          },
        },
        orderBy: {
          opco: {
            name: "asc",
          },
        },
      }),
      prisma.report.findMany({
        where: { partnerId, year, month, version: PARTNER_REPORT_VERSION },
        include: {
          opco: {
            select: { id: true, name: true },
          },
          status: {
            select: { code: true, label: true },
          },
        },
        orderBy: [{ opcoId: "asc" }, { version: "desc" }],
      }),
      prisma.report.findMany({
        where: { partnerId, version: PARTNER_REPORT_VERSION },
        include: {
          opco: {
            select: { name: true },
          },
          status: {
            select: { label: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      prisma.invoice.findMany({
        where: {
          partnerId,
          year,
          month,
          invoiceType: { code: "PARTNER_TO_CLIENT" },
          isDeleted: false,
        },
        select: { id: true },
      }),
    ]);

  const latestReportsByOpco = getLatestReportsByOpco(periodReports);
  const periodInvoiceUploaded = periodInvoices.length > 0;

  const opcoSummaries: OpcoSubmissionSummary[] = opcoLinks.map((link) => {
    const report = latestReportsByOpco.get(link.opcoId.toString());
    const status = mapReportStatusToSubmissionStatus(report?.status.code);

    return {
      opcoId: link.opcoId.toString(),
      opcoName: link.opco.name,
      status,
      reportId: report ? report.id.toString() : null,
      statusLabel: report?.status.label ?? null,
      uploadedAt: report?.createdAt.toISOString() ?? null,
    };
  });

  const submittedCount = opcoSummaries.filter(
    (item) => item.status === "submitted",
  ).length;
  const missingCount = opcoSummaries.filter(
    (item) => item.status === "missing",
  ).length;
  const changeRequestedCount = opcoSummaries.filter(
    (item) => item.status === "change_requested",
  ).length;
  const pendingCount = opcoSummaries.filter(
    (item) => item.status === "pending",
  ).length;

  return {
    year,
    month,
    partnerName: partner?.name ?? "Partner",
    linkedOpcos: opcoLinks.length,
    submittedCount,
    missingCount,
    changeRequestedCount,
    pendingCount,
    periodInvoiceUploaded,
    opcoSummaries,
    recentUploads: recentReports.map((report) => ({
      reportId: report.id.toString(),
      opcoName: report.opco.name,
      year: report.year,
      month: report.month,
      statusLabel: report.status.label,
      uploadedAt: report.createdAt.toISOString(),
    })),
  };
}

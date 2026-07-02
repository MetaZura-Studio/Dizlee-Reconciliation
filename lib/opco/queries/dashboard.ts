import prisma from "@/lib/prisma";

export type PartnerSubmissionStatus =
  | "submitted"
  | "missing"
  | "change_requested"
  | "pending";

export type PartnerSubmissionSummary = {
  partnerId: string;
  partnerName: string;
  status: PartnerSubmissionStatus;
  reportId: string | null;
  statusLabel: string | null;
  uploadedAt: string | null;
};

export type RecentUploadSummary = {
  reportId: string;
  partnerName: string;
  year: number;
  month: number;
  statusLabel: string;
  uploadedAt: string;
};

export type OpcoDashboardData = {
  year: number;
  month: number;
  opcoName: string;
  linkedPartners: number;
  submittedCount: number;
  missingCount: number;
  changeRequestedCount: number;
  pendingCount: number;
  invoicesPendingAck: number;
  partnerSummaries: PartnerSubmissionSummary[];
  recentUploads: RecentUploadSummary[];
};

export function mapReportStatusToSubmissionStatus(
  statusCode: string | undefined,
): PartnerSubmissionStatus {
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

function getLatestReportsByPartner<
  T extends { partnerId: bigint; version: number },
>(reports: T[]): Map<string, T> {
  const latestByPartner = new Map<string, T>();

  for (const report of reports) {
    const partnerKey = report.partnerId.toString();
    const existing = latestByPartner.get(partnerKey);

    if (!existing || report.version > existing.version) {
      latestByPartner.set(partnerKey, report);
    }
  }

  return latestByPartner;
}

export async function getOpcoDashboard(
  opcoId: bigint,
  year: number,
  month: number,
): Promise<OpcoDashboardData> {
  const [opco, partnerLinks, periodReports, recentReports, invoicesPendingAck] =
    await Promise.all([
      prisma.opco.findFirst({
        where: { id: opcoId },
        select: { name: true },
      }),
      prisma.opcoPartnerLink.findMany({
        where: { opcoId },
        include: {
          partner: {
            select: { id: true, name: true },
          },
        },
        orderBy: {
          partner: {
            name: "asc",
          },
        },
      }),
      prisma.report.findMany({
        where: { opcoId, year, month },
        include: {
          partner: {
            select: { id: true, name: true },
          },
          status: {
            select: { code: true, label: true },
          },
        },
        orderBy: [{ partnerId: "asc" }, { version: "desc" }],
      }),
      prisma.report.findMany({
        where: { opcoId },
        include: {
          partner: {
            select: { name: true },
          },
          status: {
            select: { label: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      prisma.invoice.count({
        where: {
          opcoId,
          invoiceType: { code: "CLIENT_TO_OPCO" },
          invoiceStatus: { code: "SENT" },
        },
      }),
    ]);

  const latestReportsByPartner = getLatestReportsByPartner(periodReports);

  const partnerSummaries: PartnerSubmissionSummary[] = partnerLinks.map(
    (link) => {
      const report = latestReportsByPartner.get(link.partnerId.toString());
      const status = mapReportStatusToSubmissionStatus(report?.status.code);

      return {
        partnerId: link.partnerId.toString(),
        partnerName: link.partner.name,
        status,
        reportId: report ? report.id.toString() : null,
        statusLabel: report?.status.label ?? null,
        uploadedAt: report?.createdAt.toISOString() ?? null,
      };
    },
  );

  const submittedCount = partnerSummaries.filter(
    (item) => item.status === "submitted",
  ).length;
  const missingCount = partnerSummaries.filter(
    (item) => item.status === "missing",
  ).length;
  const changeRequestedCount = partnerSummaries.filter(
    (item) => item.status === "change_requested",
  ).length;
  const pendingCount = partnerSummaries.filter(
    (item) => item.status === "pending",
  ).length;

  return {
    year,
    month,
    opcoName: opco?.name ?? "OpCo",
    linkedPartners: partnerLinks.length,
    submittedCount,
    missingCount,
    changeRequestedCount,
    pendingCount,
    invoicesPendingAck,
    partnerSummaries,
    recentUploads: recentReports.map((report) => ({
      reportId: report.id.toString(),
      partnerName: report.partner.name,
      year: report.year,
      month: report.month,
      statusLabel: report.status.label,
      uploadedAt: report.createdAt.toISOString(),
    })),
  };
}

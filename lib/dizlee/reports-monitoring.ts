import { currentPeriod, type DashboardPeriod } from "@/lib/dizlee/dashboard";
import {
  getReportFilterOptions,
  type ReportFilterOptions,
} from "@/lib/dizlee/reports";
import { prisma } from "@/lib/prisma";

export type MissingSideFilter = "opco" | "partner" | "any";

export type ReportMonitoringFilters = {
  month: number;
  year: number;
  opcoId?: string;
  partnerId?: string;
  missing?: MissingSideFilter;
  page: number;
};

export type LaneSubmissionStatus = "Submitted" | "Missing";

export type LaneSubmission = {
  status: LaneSubmissionStatus;
  uploadedAt: string | null;
  reportId: string | null;
};

export type ReportMonitoringLane = {
  laneKey: string;
  period: DashboardPeriod;
  opcoId: string;
  opcoName: string;
  partnerId: string;
  partnerName: string;
  opcoReport: LaneSubmission;
  partnerReport: LaneSubmission;
};

export type ReportMonitoringSummary = {
  linkedLanes: number;
  opcoMissing: number;
  partnerMissing: number;
  reportsSubmitted: number;
};

export type ReportMonitoringResult = {
  items: ReportMonitoringLane[];
  summary: ReportMonitoringSummary;
  page: number;
  pageSize: number;
  totalPages: number;
  totalCount: number;
  filters: ReportMonitoringFilters;
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

function laneSubmission(
  report: { id: bigint; createdAt: Date } | undefined,
): LaneSubmission {
  if (!report) {
    return { status: "Missing", uploadedAt: null, reportId: null };
  }

  return {
    status: "Submitted",
    uploadedAt: report.createdAt.toISOString(),
    reportId: report.id.toString(),
  };
}

export function parseReportMonitoringFilters(
  searchParams: URLSearchParams,
): ReportMonitoringFilters {
  const fallback = currentPeriod();
  const month = Number(searchParams.get("month"));
  const year = Number(searchParams.get("year"));
  const page = Number(searchParams.get("page"));
  const missing = searchParams.get("missing");

  return {
    month:
      Number.isInteger(month) && month >= 1 && month <= 12 ? month : fallback.month,
    year:
      Number.isInteger(year) && year >= 2000 && year <= 2100 ? year : fallback.year,
    opcoId: searchParams.get("opcoId") ?? undefined,
    partnerId: searchParams.get("partnerId") ?? undefined,
    missing:
      missing === "opco" || missing === "partner" || missing === "any"
        ? missing
        : undefined,
    page: Number.isInteger(page) && page >= 1 ? page : 1,
  };
}

export async function listReportMonitoringLanes(
  filters: ReportMonitoringFilters,
): Promise<ReportMonitoringResult> {
  const period = periodFromParts(filters.month, filters.year);

  const linkWhere: {
    opcoId?: bigint;
    partnerId?: bigint;
  } = {};

  if (filters.opcoId) {
    linkWhere.opcoId = BigInt(filters.opcoId);
  }
  if (filters.partnerId) {
    linkWhere.partnerId = BigInt(filters.partnerId);
  }

  const [links, reports] = await Promise.all([
    prisma.opcoPartnerLink.findMany({
      where: linkWhere,
      orderBy: [{ opco: { name: "asc" } }, { partner: { name: "asc" } }],
      include: {
        opco: { select: { id: true, name: true } },
        partner: { select: { id: true, name: true } },
      },
    }),
    prisma.report.findMany({
      where: {
        month: filters.month,
        year: filters.year,
        ...(filters.opcoId ? { opcoId: BigInt(filters.opcoId) } : {}),
        ...(filters.partnerId ? { partnerId: BigInt(filters.partnerId) } : {}),
      },
      include: {
        uploadedByUser: { select: { role: { select: { code: true } } } },
      },
    }),
  ]);

  const linkKeys = new Set(
    links.map((link) => `${link.opcoId.toString()}-${link.partnerId.toString()}`),
  );

  const opcoReports = new Map<string, { id: bigint; createdAt: Date }>();
  const partnerReports = new Map<string, { id: bigint; createdAt: Date }>();

  for (const report of reports) {
    const laneKey = `${report.opcoId.toString()}-${report.partnerId.toString()}`;
    if (!linkKeys.has(laneKey)) {
      continue;
    }

    const uploaderRole = report.uploadedByUser?.role?.code;
    if (uploaderRole === "OPCO") {
      opcoReports.set(laneKey, { id: report.id, createdAt: report.createdAt });
    } else if (uploaderRole === "PARTNER") {
      partnerReports.set(laneKey, { id: report.id, createdAt: report.createdAt });
    }
  }

  let lanes: ReportMonitoringLane[] = links.map((link) => {
    const laneKey = `${link.opcoId.toString()}-${link.partnerId.toString()}`;

    return {
      laneKey,
      period,
      opcoId: link.opco.id.toString(),
      opcoName: link.opco.name,
      partnerId: link.partner.id.toString(),
      partnerName: link.partner.name,
      opcoReport: laneSubmission(opcoReports.get(laneKey)),
      partnerReport: laneSubmission(partnerReports.get(laneKey)),
    };
  });

  const summary: ReportMonitoringSummary = {
    linkedLanes: lanes.length,
    opcoMissing: lanes.filter((lane) => lane.opcoReport.status === "Missing").length,
    partnerMissing: lanes.filter((lane) => lane.partnerReport.status === "Missing")
      .length,
    reportsSubmitted: reports.length,
  };

  if (filters.missing === "opco") {
    lanes = lanes.filter((lane) => lane.opcoReport.status === "Missing");
  } else if (filters.missing === "partner") {
    lanes = lanes.filter((lane) => lane.partnerReport.status === "Missing");
  } else if (filters.missing === "any") {
    lanes = lanes.filter(
      (lane) =>
        lane.opcoReport.status === "Missing" ||
        lane.partnerReport.status === "Missing",
    );
  }

  const totalCount = lanes.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const page = Math.min(filters.page, totalPages);
  const items = lanes.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return {
    items,
    summary,
    page,
    pageSize: PAGE_SIZE,
    totalPages,
    totalCount,
    filters: { ...filters, page },
  };
}

export {
  getReportFilterOptions,
  type ReportFilterOptions,
  PAGE_SIZE as REPORT_MONITORING_PAGE_SIZE,
};

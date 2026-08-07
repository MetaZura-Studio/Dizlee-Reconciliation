/**
 * Report submission monitoring: missing-side lanes, pagination, and reminder eligibility.
 * Consumed by reports monitoring UI and automated/manual reminder sends.
 */

import { currentPeriod, type DashboardPeriod } from "@/lib/dizlee/dashboard";
import { getLaneNotificationSummaries } from "@/lib/dizlee/lane-report-notifications";
import {
  getReportFilterOptions,
  type ReportFilterOptions,
} from "@/lib/dizlee/reports";
import type {
  LaneSubmission,
  ReportMonitoringFilters,
  ReportMonitoringLane,
  ReportMonitoringResult,
  ReportMonitoringSummary,
} from "@/lib/dizlee/reports-monitoring.shared";
import { ACTIVE_OPCO_PARTNER_LINK_FILTER } from "@/lib/platform/opco-partner-links";
import { prisma } from "@/lib/prisma";

export type {
  LaneSubmission,
  LaneSubmissionStatus,
  MissingSideFilter,
  ReportMonitoringFilters,
  ReportMonitoringLane,
  ReportMonitoringResult,
  ReportMonitoringSortField,
  ReportMonitoringSummary,
  SortDirection,
} from "@/lib/dizlee/reports-monitoring.shared";

export {
  monitoringLaneNeedsReminder,
  monitoringLaneToCompareLane,
} from "@/lib/dizlee/reports-monitoring.shared";

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
  const sortBy = searchParams.get("sortBy");
  const sortDir = searchParams.get("sortDir");

  return {
    month:
      Number.isInteger(month) && month >= 1 && month <= 12 ? month : fallback.month,
    year:
      Number.isInteger(year) && year >= 2000 && year <= 2100 ? year : fallback.year,
    opcoId: searchParams.get("opcoId") ?? undefined,
    partnerId: searchParams.get("partnerId") ?? undefined,
    missing:
      missing === "opco" ||
      missing === "partner" ||
      missing === "any" ||
      missing === "both"
        ? missing
        : undefined,
    page: Number.isInteger(page) && page >= 1 ? page : 1,
    sortBy:
      sortBy === "period" || sortBy === "opco" || sortBy === "partner"
        ? sortBy
        : "opco",
    sortDir: sortDir === "desc" ? "desc" : "asc",
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
      where: { ...linkWhere, ...ACTIVE_OPCO_PARTNER_LINK_FILTER },
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

  const notificationSummaries = await getLaneNotificationSummaries({
    month: filters.month,
    year: filters.year,
    lanes: links.map((link) => ({
      opcoId: link.opco.id.toString(),
      partnerId: link.partner.id.toString(),
    })),
  });

  let lanes: ReportMonitoringLane[] = links.map((link) => {
    const laneKey = `${link.opcoId.toString()}-${link.partnerId.toString()}`;
    const notificationSummary = notificationSummaries.get(laneKey);

    return {
      laneKey,
      period,
      opcoId: link.opco.id.toString(),
      opcoName: link.opco.name,
      partnerId: link.partner.id.toString(),
      partnerName: link.partner.name,
      opcoReport: laneSubmission(opcoReports.get(laneKey)),
      partnerReport: laneSubmission(partnerReports.get(laneKey)),
      lastOpcoReminderAt: notificationSummary?.lastOpcoReminderAt ?? null,
      lastPartnerReminderAt: notificationSummary?.lastPartnerReminderAt ?? null,
      lastOpcoIntimationAt: notificationSummary?.lastOpcoIntimationAt ?? null,
      lastPartnerIntimationAt: notificationSummary?.lastPartnerIntimationAt ?? null,
      notificationCount: notificationSummary?.totalCount ?? 0,
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
  } else if (filters.missing === "both") {
    lanes = lanes.filter(
      (lane) =>
        lane.opcoReport.status === "Submitted" &&
        lane.partnerReport.status === "Submitted",
    );
  }

  const dir = filters.sortDir === "asc" ? 1 : -1;
  lanes = [...lanes].sort((a, b) => {
    if (filters.sortBy === "period") {
      const av = a.period.year * 100 + a.period.month;
      const bv = b.period.year * 100 + b.period.month;
      if (av !== bv) {
        return (av - bv) * dir;
      }
    }
    if (filters.sortBy === "partner") {
      const byPartner = a.partnerName.localeCompare(b.partnerName) * dir;
      if (byPartner !== 0) {
        return byPartner;
      }
      return a.opcoName.localeCompare(b.opcoName) * dir;
    }
    const byOpco = a.opcoName.localeCompare(b.opcoName) * dir;
    if (byOpco !== 0) {
      return byOpco;
    }
    return a.partnerName.localeCompare(b.partnerName) * dir;
  });

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

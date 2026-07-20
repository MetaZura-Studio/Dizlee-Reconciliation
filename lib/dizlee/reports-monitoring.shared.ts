import type { DashboardPeriod } from "@/lib/dizlee/dashboard";
import type { CompareLaneRow, LaneState } from "@/lib/dizlee/reconciliation";

export type MissingSideFilter = "opco" | "partner" | "any";

export type ReportMonitoringFilters = {
  month: number;
  year: number;
  opcoId?: string;
  partnerId?: string;
  missing?: MissingSideFilter;
  page: number;
  sortBy: ReportMonitoringSortField;
  sortDir: SortDirection;
};

export type ReportMonitoringSortField = "period" | "opco" | "partner";
export type SortDirection = "asc" | "desc";

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
  lastOpcoReminderAt: string | null;
  lastPartnerReminderAt: string | null;
  lastOpcoIntimationAt: string | null;
  lastPartnerIntimationAt: string | null;
  notificationCount: number;
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

function laneReminderState(
  lane: Pick<ReportMonitoringLane, "opcoReport" | "partnerReport">,
): LaneState {
  const opcoMissing = lane.opcoReport.status === "Missing";
  const partnerMissing = lane.partnerReport.status === "Missing";

  if (opcoMissing && partnerMissing) {
    return "MISSING";
  }
  if (opcoMissing) {
    return "NO_OPCO_REPORT";
  }
  if (partnerMissing) {
    return "NO_PARTNER_REPORT";
  }

  return "READY";
}

export function monitoringLaneNeedsReminder(lane: ReportMonitoringLane): boolean {
  const state = laneReminderState(lane);
  return (
    state === "MISSING" ||
    state === "NO_OPCO_REPORT" ||
    state === "NO_PARTNER_REPORT"
  );
}

export function monitoringLaneToCompareLane(
  lane: ReportMonitoringLane,
): CompareLaneRow {
  return {
    opcoId: lane.opcoId,
    opcoName: lane.opcoName,
    partnerId: lane.partnerId,
    partnerName: lane.partnerName,
    period: lane.period,
    opcoReportId: lane.opcoReport.reportId,
    partnerReportId: lane.partnerReport.reportId,
    opcoReportFilename: null,
    partnerReportFilename: null,
    state: laneReminderState(lane),
    outcome: null,
    reconciliationId: null,
    canRun: false,
    lastOpcoReminderAt: lane.lastOpcoReminderAt,
    lastPartnerReminderAt: lane.lastPartnerReminderAt,
    lastOpcoIntimationAt: lane.lastOpcoIntimationAt,
    lastPartnerIntimationAt: lane.lastPartnerIntimationAt,
    notificationCount: lane.notificationCount,
  };
}

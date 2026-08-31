/**
 * Monitoring dashboard for report submission progress by pair and period.
 * Highlights missing or late reports against expectations.
 */

"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { KpiCard } from "@/components/dizlee/kpi-card";
import { LaneRemindModal } from "@/components/dizlee/lane-remind-modal";
import { ReportDetailModal } from "@/components/dizlee/report-detail-modal";
import { ReportsTabs } from "@/components/dizlee/reports-tabs";
import { Button } from "@/components/ui/button";
import {
  DataTable,
  DataTableFrame,
  DataTableHead,
  DataTableRow,
  DataTableTd,
  DataTableTh,
  SortableDataTableTh,
} from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { IconButton } from "@/components/ui/icon-button";
import { IconBell, IconCompare, IconEye } from "@/components/ui/icons";
import { FilterToolbar, PageCard, PageHeader } from "@/components/ui/page";
import { StatusPill } from "@/components/ui/status-pill";
import { useToast } from "@/components/ui/toast";
import { LoadingOverlay } from "@/components/ui/loading";
import { ui } from "@/lib/ui/classes";
import { nextSortState, type SortDirection } from "@/lib/ui/sort";
import type { ReportDetail, ReportFilterOptions } from "@/lib/dizlee/reports";
import {
  getCurrentPeriod,
  getMaxMonthForYear,
  getPeriodYearOptions,
} from "@/lib/platform/period";
import type {
  MissingSideFilter,
  ReportMonitoringFilters,
  ReportMonitoringLane,
  ReportMonitoringResult,
  ReportMonitoringSortField,
} from "@/lib/dizlee/reports-monitoring.shared";
import {
  monitoringLaneNeedsReminder,
  monitoringLaneToCompareLane,
} from "@/lib/dizlee/reports-monitoring.shared";
import { formatAppDateTime, formatAppMonthYear } from "@/lib/platform/format-datetime";
import { formatAppError } from "@/lib/errors/format";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function reportMonitoringStatusTone(
  status: "Submitted" | "Missing",
): "success" | "warning" {
  return status === "Submitted" ? "success" : "warning";
}

function monitoringLaneReadyToReconcile(lane: ReportMonitoringLane): boolean {
  return (
    lane.opcoReport.status === "Submitted" &&
    lane.partnerReport.status === "Submitted"
  );
}

function reconciliationHref(lane: ReportMonitoringLane): string {
  const params = new URLSearchParams({
    month: String(lane.period.month),
    year: String(lane.period.year),
    searchBy: "opco",
    entityId: lane.opcoId,
    search: lane.partnerName,
    status: "READY",
  });
  return `/dizlee/reconciliation?${params.toString()}`;
}

function ReportSubmissionCell({
  status,
  uploadedAt,
  reportId,
  onView,
}: {
  status: "Submitted" | "Missing";
  uploadedAt: string | null;
  reportId: string | null;
  onView: (reportId: string) => void;
}) {
  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-2">
        {reportId ? (
          <IconButton
            label="View report data"
            onClick={() => onView(reportId)}
          >
            <IconEye />
          </IconButton>
        ) : null}
        <StatusPill tone={reportMonitoringStatusTone(status)}>{status}</StatusPill>
      </div>
      <p className="text-xs text-foreground-subtle">{formatAppDateTime(uploadedAt)}</p>
    </div>
  );
}

function lastReminderLabel(lane: ReportMonitoringLane): string {
  const times = [
    lane.lastOpcoReminderAt,
    lane.lastPartnerReminderAt,
    lane.lastOpcoIntimationAt,
    lane.lastPartnerIntimationAt,
  ].filter((value): value is string => Boolean(value));

  if (times.length === 0) {
    return "No reminders yet";
  }

  const latest = times.sort((a, b) => (a < b ? 1 : -1))[0];
  return `Last notice: ${formatAppDateTime(latest)}`;
}

function buildQuery(filters: ReportMonitoringFilters): string {
  const params = new URLSearchParams({
    month: String(filters.month),
    year: String(filters.year),
    page: String(filters.page),
    sortBy: filters.sortBy,
    sortDir: filters.sortDir,
  });
  if (filters.opcoId) {
    params.set("opcoId", filters.opcoId);
  }
  if (filters.partnerId) {
    params.set("partnerId", filters.partnerId);
  }
  if (filters.missing) {
    params.set("missing", filters.missing);
  }
  return params.toString();
}

type ReportsMonitoringViewProps = {
  initialResult: ReportMonitoringResult;
  initialFilterOptions: ReportFilterOptions;
  fromDashboard?: boolean;
};

export function ReportsMonitoringView({
  initialResult,
  initialFilterOptions,
  fromDashboard = false,
}: ReportsMonitoringViewProps) {
  const router = useRouter();
  const [month, setMonth] = useState(initialResult.filters.month);
  const [year, setYear] = useState(initialResult.filters.year);
  const [opcoId, setOpcoId] = useState(initialResult.filters.opcoId ?? "");
  const [partnerId, setPartnerId] = useState(
    initialResult.filters.partnerId ?? "",
  );
  const [missing, setMissing] = useState<MissingSideFilter | "">(
    initialResult.filters.missing ?? "",
  );
  const [sortBy, setSortBy] = useState<ReportMonitoringSortField>(
    initialResult.filters.sortBy,
  );
  const [sortDir, setSortDir] = useState<SortDirection>(
    initialResult.filters.sortDir,
  );

  const [result, setResult] = useState<ReportMonitoringResult>(initialResult);
  const [filterOptions, setFilterOptions] =
    useState<ReportFilterOptions>(initialFilterOptions);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<ReportDetail | null>(null);
  const [remindLane, setRemindLane] = useState<ReportMonitoringLane | null>(null);

  const loadMonitoring = useCallback(async (filters: ReportMonitoringFilters) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/dizlee/reports/monitoring?${buildQuery(filters)}`,
      );
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(formatAppError(payload, "Failed to load reports monitoring"));
      }
      setResult(payload.data as ReportMonitoringResult);
      setFilterOptions(payload.filterOptions as ReportFilterOptions);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load reports monitoring",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const applyFilters = () => {
    void loadMonitoring({
      month,
      year,
      opcoId: opcoId || undefined,
      partnerId: partnerId || undefined,
      missing: missing || undefined,
      page: 1,
      sortBy,
      sortDir,
    });
  };

  const applySort = (field: ReportMonitoringSortField) => {
    const next = nextSortState(sortBy, sortDir, field);
    setSortBy(next.sortBy);
    setSortDir(next.sortDir);
    void loadMonitoring({
      ...result.filters,
      month,
      year,
      opcoId: opcoId || undefined,
      partnerId: partnerId || undefined,
      missing: missing || undefined,
      page: 1,
      sortBy: next.sortBy,
      sortDir: next.sortDir,
    });
  };

  const refresh = () => {
    void loadMonitoring({ ...result.filters, sortBy, sortDir, page: 1 });
  };

  const clearFilters = () => {
    const period = getCurrentPeriod();
    setMonth(period.month);
    setYear(period.year);
    setOpcoId("");
    setPartnerId("");
    setMissing("");
    setSortBy(initialResult.filters.sortBy);
    setSortDir(initialResult.filters.sortDir);
    void loadMonitoring({
      month: period.month,
      year: period.year,
      page: 1,
      sortBy: initialResult.filters.sortBy,
      sortDir: initialResult.filters.sortDir,
    });
  };

  useEffect(() => {
    const handleFocus = () => {
      void loadMonitoring({ ...result.filters, page: 1 });
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [loadMonitoring, result.filters]);

  const goToPage = (nextPage: number) => {
    void loadMonitoring({ ...result.filters, page: nextPage });
  };

  const openDetail = async (reportId: string) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetail(null);
    try {
      const response = await fetch(`/api/dizlee/reports/${reportId}`);
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(formatAppError(payload, "Failed to load report"));
      }
      setDetail(payload.data as ReportDetail);
    } catch (detailError) {
      setError(
        detailError instanceof Error
          ? detailError.message
          : "Failed to load report",
      );
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const yearOptions = getPeriodYearOptions();
  const maxMonth = getMaxMonthForYear(year);

  const items = result.items;
  const { summary } = result;

  return (
    <PageCard>
      <PageHeader
        title="Dizlee - Reports"
        description={
          fromDashboard
            ? "Track OpCo and Partner report uploads for each linked pair in the selected period. From dashboard."
            : "Track OpCo and Partner report uploads for each linked pair in the selected period."
        }
      />

      <ReportsTabs active="monitoring" />

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="OpCo–Partner pairs" value={summary.linkedLanes} />
        <KpiCard label="OpCo reports missing" value={summary.opcoMissing} />
        <KpiCard label="Partner reports missing" value={summary.partnerMissing} />
        <KpiCard label="Reports submitted" value={summary.reportsSubmitted} />
      </div>

      <FilterToolbar className="mt-4">
        <div className="grid w-full gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <label className="text-sm">
            <span className={ui.label}>Period (month)</span>
            <select
              value={month}
              onChange={(event) => setMonth(Number(event.target.value))}
              className={ui.select}
            >
              {MONTHS.slice(0, maxMonth).map((name, index) => (
                <option key={name} value={index + 1}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className={ui.label}>Year</span>
            <select
              value={year}
              onChange={(event) => {
                const nextYear = Number(event.target.value);
                setYear(nextYear);
                const capped = getMaxMonthForYear(nextYear);
                if (month > capped) setMonth(capped);
              }}
              className={ui.select}
            >
              {yearOptions.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className={ui.label}>OpCo</span>
            <select
              value={opcoId}
              onChange={(event) => setOpcoId(event.target.value)}
              className={ui.select}
            >
              <option value="">All OpCos</option>
              {filterOptions.opcos.map((opco) => (
                <option key={opco.id} value={opco.id}>
                  {opco.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className={ui.label}>Partner</span>
            <select
              value={partnerId}
              onChange={(event) => setPartnerId(event.target.value)}
              className={ui.select}
            >
              <option value="">All Partners</option>
              {filterOptions.partners.map((partner) => (
                <option key={partner.id} value={partner.id}>
                  {partner.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className={ui.label}>Show</span>
            <select
              value={missing}
              onChange={(event) =>
                setMissing(event.target.value as MissingSideFilter | "")
              }
              className={ui.select}
            >
              <option value="">All pairs</option>
              <option value="opco">Missing OpCo reports</option>
              <option value="partner">Missing Partner reports</option>
              <option value="any">Any missing report</option>
              <option value="both">Both OpCo & Partner submitted</option>
            </select>
          </label>
        </div>
        <div className="flex w-full gap-3">
          <Button onClick={applyFilters}>Apply</Button>
          <Button variant="secondary" onClick={refresh}>
            Refresh
          </Button>
          <Button variant="secondary" onClick={clearFilters}>
            Clear filters
          </Button>
        </div>
      </FilterToolbar>

      {error ? <div className={`mt-4 ${ui.alertError}`}>{error}</div> : null}
      {!error ? (
        <LoadingOverlay active={loading} className="mt-6 min-h-[12rem]">
        {items.length > 0 ? (
          <div className="mt-6 space-y-4">
            <DataTableFrame>
              <DataTable>
                <DataTableHead>
                    <tr>
                      <SortableDataTableTh
                        label="Period"
                        active={sortBy === "period"}
                        direction={sortDir}
                        onSort={() => applySort("period")}
                        align="center"
                      />
                      <SortableDataTableTh
                        label="OpCo"
                        active={sortBy === "opco"}
                        direction={sortDir}
                        onSort={() => applySort("opco")}
                      />
                      <SortableDataTableTh
                        label="Partner"
                        active={sortBy === "partner"}
                        direction={sortDir}
                        onSort={() => applySort("partner")}
                      />
                      <DataTableTh align="center">OpCo report</DataTableTh>
                      <DataTableTh align="center">Partner report</DataTableTh>
                      <DataTableTh align="center">Actions</DataTableTh>
                    </tr>
                </DataTableHead>
                <tbody>
                  {items.map((row) => (
                    <DataTableRow key={row.laneKey}>
                      <DataTableTd className="text-foreground-muted" align="center">
                        {formatAppMonthYear(row.period.month, row.period.year)}
                      </DataTableTd>
                      <DataTableTd>{row.opcoName}</DataTableTd>
                      <DataTableTd>{row.partnerName}</DataTableTd>
                      <DataTableTd align="center">
                        <ReportSubmissionCell
                          status={row.opcoReport.status}
                          uploadedAt={row.opcoReport.uploadedAt}
                          reportId={row.opcoReport.reportId}
                          onView={(reportId) => void openDetail(reportId)}
                        />
                      </DataTableTd>
                      <DataTableTd align="center">
                        <ReportSubmissionCell
                          status={row.partnerReport.status}
                          uploadedAt={row.partnerReport.uploadedAt}
                          reportId={row.partnerReport.reportId}
                          onView={(reportId) => void openDetail(reportId)}
                        />
                      </DataTableTd>
                      <DataTableTd align="center">
                        <div className="flex flex-wrap items-center justify-center gap-2">
                          {monitoringLaneNeedsReminder(row) ? (
                            <IconButton
                              label={
                                row.notificationCount > 0
                                  ? `Remind… · ${lastReminderLabel(row)} · ${row.notificationCount} prior notice${row.notificationCount === 1 ? "" : "s"}`
                                  : `Remind… · ${lastReminderLabel(row)}`
                              }
                              onClick={() => setRemindLane(row)}
                            >
                              <IconBell />
                            </IconButton>
                          ) : null}
                          {monitoringLaneReadyToReconcile(row) ? (
                            <IconButton
                              label="Open reconciliation"
                              variant="primary"
                              onClick={() => router.push(reconciliationHref(row))}
                            >
                              <IconCompare />
                            </IconButton>
                          ) : null}
                        </div>
                      </DataTableTd>
                    </DataTableRow>
                  ))}
                </tbody>
              </DataTable>
            </DataTableFrame>

            <div className="flex items-center justify-between text-sm text-foreground-muted">
              <p>
                Page {result.page} / {result.totalPages} · Total{" "}
                {result.totalCount} records
              </p>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  disabled={result.page <= 1}
                  onClick={() => goToPage(result.page - 1)}
                >
                  Prev
                </Button>
                <Button
                  variant="secondary"
                  disabled={result.page >= result.totalPages}
                  onClick={() => goToPage(result.page + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <EmptyState
            className="mt-6"
            title="No pairs match filters"
            description={
              summary.linkedLanes === 0
                ? "No OpCo–Partner links are configured for this scope."
                : "Try adjusting filters or select a different period."
            }
          />
        )}
        </LoadingOverlay>
      ) : null}

      {detailOpen ? (
        <ReportDetailModal
          detail={detail}
          loading={detailLoading}
          onClose={() => {
            setDetailOpen(false);
            setDetail(null);
          }}
        />
      ) : null}

      {remindLane ? (
        <LaneRemindModal
          lane={monitoringLaneToCompareLane(remindLane)}
          month={remindLane.period.month}
          year={remindLane.period.year}
          onClose={() => setRemindLane(null)}
          onSent={(sentMessage) => {
            toast.success(sentMessage);
            void loadMonitoring({ ...result.filters, sortBy, sortDir });
          }}
        />
      ) : null}
    </PageCard>
  );
}

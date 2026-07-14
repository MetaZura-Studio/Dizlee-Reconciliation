"use client";

import { useCallback, useEffect, useState } from "react";

import { KpiCard } from "@/components/dizlee/kpi-card";
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
} from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { IconButton } from "@/components/ui/icon-button";
import { IconEye } from "@/components/ui/icons";
import { FilterToolbar, PageCard, PageHeader } from "@/components/ui/page";
import { StatusPill } from "@/components/ui/status-pill";
import { LoadingBar } from "@/components/ui/loading";
import { ui } from "@/lib/ui/classes";
import type { ReportDetail, ReportFilterOptions } from "@/lib/dizlee/reports";
import type {
  MissingSideFilter,
  ReportMonitoringFilters,
  ReportMonitoringResult,
} from "@/lib/dizlee/reports-monitoring";

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

function formatDateTime(value: string | null): string {
  if (!value) {
    return "—";
  }
  return new Date(value).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatPeriod(month: number, year: number): string {
  return new Date(year, month - 1, 1).toLocaleString("en-US", {
    month: "short",
    year: "numeric",
  });
}

function reportMonitoringStatusTone(
  status: "Submitted" | "Missing",
): "success" | "warning" {
  return status === "Submitted" ? "success" : "warning";
}

function buildQuery(filters: ReportMonitoringFilters): string {
  const params = new URLSearchParams({
    month: String(filters.month),
    year: String(filters.year),
    page: String(filters.page),
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
  const [month, setMonth] = useState(initialResult.filters.month);
  const [year, setYear] = useState(initialResult.filters.year);
  const [opcoId, setOpcoId] = useState(initialResult.filters.opcoId ?? "");
  const [partnerId, setPartnerId] = useState(
    initialResult.filters.partnerId ?? "",
  );
  const [missing, setMissing] = useState<MissingSideFilter | "">(
    initialResult.filters.missing ?? "",
  );

  const [result, setResult] = useState<ReportMonitoringResult>(initialResult);
  const [filterOptions, setFilterOptions] =
    useState<ReportFilterOptions>(initialFilterOptions);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<ReportDetail | null>(null);

  const loadMonitoring = useCallback(async (filters: ReportMonitoringFilters) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/dizlee/reports/monitoring?${buildQuery(filters)}`,
      );
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to load reports monitoring");
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
    });
  };

  const refresh = () => {
    void loadMonitoring({ ...result.filters, page: 1 });
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
        throw new Error(payload.error ?? "Failed to load report");
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

  const yearOptions = [];
  for (let value = year + 1; value >= year - 4; value -= 1) {
    yearOptions.push(value);
  }

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
              {MONTHS.map((name, index) => (
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
              onChange={(event) => setYear(Number(event.target.value))}
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
            </select>
          </label>
        </div>
        <div className="flex w-full gap-3">
          <Button onClick={applyFilters}>Apply</Button>
          <Button variant="secondary" onClick={refresh}>
            Refresh
          </Button>
        </div>
      </FilterToolbar>

      {loading ? (
        <div className="mt-4">
          <LoadingBar active />
        </div>
      ) : null}
      {error ? <div className={`mt-4 ${ui.alertError}`}>{error}</div> : null}

      {!loading && !error ? (
        items.length > 0 ? (
          <div className="mt-6 space-y-4">
            <DataTableFrame>
              <DataTable>
                <DataTableHead>
                  <tr>
                    <DataTableTh>Period</DataTableTh>
                    <DataTableTh>OpCo</DataTableTh>
                    <DataTableTh>Partner</DataTableTh>
                    <DataTableTh>OpCo report</DataTableTh>
                    <DataTableTh>Partner report</DataTableTh>
                  </tr>
                </DataTableHead>
                <tbody>
                  {items.map((row) => (
                    <DataTableRow key={row.laneKey}>
                      <DataTableTd className="text-foreground-muted">
                        {formatPeriod(row.period.month, row.period.year)}
                      </DataTableTd>
                      <DataTableTd>{row.opcoName}</DataTableTd>
                      <DataTableTd>{row.partnerName}</DataTableTd>
                      <DataTableTd>
                        <StatusPill
                          tone={reportMonitoringStatusTone(row.opcoReport.status)}
                        >
                          {row.opcoReport.status}
                        </StatusPill>
                        <p className="mt-1 text-xs text-foreground-subtle">
                          {formatDateTime(row.opcoReport.uploadedAt)}
                        </p>
                        {row.opcoReport.reportId ? (
                          <IconButton
                            label="View report data"
                            onClick={() =>
                              void openDetail(row.opcoReport.reportId as string)
                            }
                          >
                            <IconEye />
                          </IconButton>
                        ) : null}
                      </DataTableTd>
                      <DataTableTd>
                        <StatusPill
                          tone={reportMonitoringStatusTone(row.partnerReport.status)}
                        >
                          {row.partnerReport.status}
                        </StatusPill>
                        <p className="mt-1 text-xs text-foreground-subtle">
                          {formatDateTime(row.partnerReport.uploadedAt)}
                        </p>
                        {row.partnerReport.reportId ? (
                          <IconButton
                            label="View report data"
                            onClick={() =>
                              void openDetail(row.partnerReport.reportId as string)
                            }
                          >
                            <IconEye />
                          </IconButton>
                        ) : null}
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
        )
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
    </PageCard>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";

import { KpiCard } from "@/components/dizlee/kpi-card";
import { ReportDetailModal } from "@/components/dizlee/report-detail-modal";
import { ReportsTabs } from "@/components/dizlee/reports-tabs";
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

function statusClass(status: "Submitted" | "Missing"): string {
  return status === "Submitted"
    ? "text-success"
    : "text-warning";
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
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Dizlee - Reports</h1>
        <p className="mt-1 text-sm text-foreground-subtle">
          Track OpCo and Partner report uploads for each linked pair in the selected period.
        </p>
        {fromDashboard ? (
          <p className="mt-1 text-xs text-foreground-subtle">From dashboard</p>
        ) : null}
      </div>

      <ReportsTabs active="monitoring" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="OpCo–Partner pairs" value={summary.linkedLanes} />
        <KpiCard label="OpCo reports missing" value={summary.opcoMissing} />
        <KpiCard label="Partner reports missing" value={summary.partnerMissing} />
        <KpiCard label="Reports submitted" value={summary.reportsSubmitted} />
      </div>

      <section className="rounded-lg border border-border bg-surface-muted p-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <label className="text-sm">
            <span className="mb-1 block text-xs text-foreground-subtle">Period (month)</span>
            <select
              value={month}
              onChange={(event) => setMonth(Number(event.target.value))}
              className="w-full rounded-md border border-border-strong px-3 py-1.5 text-sm"
            >
              {MONTHS.map((name, index) => (
                <option key={name} value={index + 1}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs text-foreground-subtle">Year</span>
            <select
              value={year}
              onChange={(event) => setYear(Number(event.target.value))}
              className="w-full rounded-md border border-border-strong px-3 py-1.5 text-sm"
            >
              {yearOptions.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs text-foreground-subtle">OpCo</span>
            <select
              value={opcoId}
              onChange={(event) => setOpcoId(event.target.value)}
              className="w-full rounded-md border border-border-strong px-3 py-1.5 text-sm"
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
            <span className="mb-1 block text-xs text-foreground-subtle">Partner</span>
            <select
              value={partnerId}
              onChange={(event) => setPartnerId(event.target.value)}
              className="w-full rounded-md border border-border-strong px-3 py-1.5 text-sm"
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
            <span className="mb-1 block text-xs text-foreground-subtle">Show</span>
            <select
              value={missing}
              onChange={(event) =>
                setMissing(event.target.value as MissingSideFilter | "")
              }
              className="w-full rounded-md border border-border-strong px-3 py-1.5 text-sm"
            >
              <option value="">All pairs</option>
              <option value="opco">Missing OpCo reports</option>
              <option value="partner">Missing Partner reports</option>
              <option value="any">Any missing report</option>
            </select>
          </label>
        </div>
        <div className="mt-4 flex gap-3">
          <button
            type="button"
            onClick={applyFilters}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
          >
            Apply
          </button>
          <button
            type="button"
            onClick={refresh}
            className="rounded-md border border-border-strong px-4 py-2 text-sm text-foreground-muted hover:bg-surface-muted"
          >
            Refresh
          </button>
        </div>
      </section>

      {loading ? (
        <p className="text-sm text-foreground-subtle">Loading reports monitoring…</p>
      ) : null}
      {error ? (
        <div className="rounded-md border border-danger-border bg-danger-muted p-4 text-sm text-danger">
          {error}
        </div>
      ) : null}

      {!loading && !error ? (
        items.length > 0 ? (
          <>
            <div className="overflow-hidden rounded-lg border border-border">
              <table className="min-w-full divide-y divide-border text-sm">
                <thead className="bg-surface-muted">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-foreground-muted">
                      Period
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-foreground-muted">
                      OpCo
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-foreground-muted">
                      Partner
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-foreground-muted">
                      OpCo report
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-foreground-muted">
                      Partner report
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-surface">
                  {items.map((row) => (
                    <tr key={row.laneKey}>
                      <td className="px-4 py-3 text-foreground-muted">
                        {formatPeriod(row.period.month, row.period.year)}
                      </td>
                      <td className="px-4 py-3 text-foreground">{row.opcoName}</td>
                      <td className="px-4 py-3 text-foreground">
                        {row.partnerName}
                      </td>
                      <td className="px-4 py-3">
                        <p className={statusClass(row.opcoReport.status)}>
                          {row.opcoReport.status}
                        </p>
                        <p className="text-xs text-foreground-subtle">
                          {formatDateTime(row.opcoReport.uploadedAt)}
                        </p>
                        {row.opcoReport.reportId ? (
                          <button
                            type="button"
                            onClick={() =>
                              void openDetail(row.opcoReport.reportId as string)
                            }
                            className="text-xs text-foreground-muted underline hover:text-foreground"
                          >
                            View report data
                          </button>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <p className={statusClass(row.partnerReport.status)}>
                          {row.partnerReport.status}
                        </p>
                        <p className="text-xs text-foreground-subtle">
                          {formatDateTime(row.partnerReport.uploadedAt)}
                        </p>
                        {row.partnerReport.reportId ? (
                          <button
                            type="button"
                            onClick={() =>
                              void openDetail(row.partnerReport.reportId as string)
                            }
                            className="text-xs text-foreground-muted underline hover:text-foreground"
                          >
                            View report data
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between text-sm text-foreground-muted">
              <p>
                Page {result.page} / {result.totalPages} · Total{" "}
                {result.totalCount} records
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={result.page <= 1}
                  onClick={() => goToPage(result.page - 1)}
                  className="rounded-md border border-border-strong px-3 py-1 disabled:opacity-40"
                >
                  Prev
                </button>
                <button
                  type="button"
                  disabled={result.page >= result.totalPages}
                  onClick={() => goToPage(result.page + 1)}
                  className="rounded-md border border-border-strong px-3 py-1 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="rounded-lg border border-border bg-surface p-8 text-center">
            <p className="font-medium text-foreground">No pairs match filters</p>
            <p className="mt-1 text-sm text-foreground-muted">
              {summary.linkedLanes === 0
                ? "No OpCo–Partner links are configured for this scope."
                : "Try adjusting filters or select a different period."}
            </p>
          </div>
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
    </div>
  );
}

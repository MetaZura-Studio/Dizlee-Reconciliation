"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { KpiCard } from "@/components/dizlee/kpi-card";
import { ReportsTabs } from "@/components/dizlee/reports-tabs";
import type { ReportFilterOptions } from "@/lib/dizlee/reports";
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
    ? "text-emerald-700"
    : "text-amber-700";
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

  const yearOptions = [];
  for (let value = year + 1; value >= year - 4; value -= 1) {
    yearOptions.push(value);
  }

  const items = result.items;
  const { summary } = result;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Dizlee - Reports</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Linked OpCo and Partner report lanes for the selected period.
        </p>
        {fromDashboard ? (
          <p className="mt-1 text-xs text-zinc-500">From dashboard</p>
        ) : null}
      </div>

      <ReportsTabs active="monitoring" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Linked lanes" value={summary.linkedLanes} />
        <KpiCard label="OpCo reports missing" value={summary.opcoMissing} />
        <KpiCard label="Partner reports missing" value={summary.partnerMissing} />
        <KpiCard label="Reports submitted" value={summary.reportsSubmitted} />
      </div>

      <section className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <label className="text-sm">
            <span className="mb-1 block text-xs text-zinc-500">Period (month)</span>
            <select
              value={month}
              onChange={(event) => setMonth(Number(event.target.value))}
              className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm"
            >
              {MONTHS.map((name, index) => (
                <option key={name} value={index + 1}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs text-zinc-500">Year</span>
            <select
              value={year}
              onChange={(event) => setYear(Number(event.target.value))}
              className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm"
            >
              {yearOptions.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs text-zinc-500">OpCo</span>
            <select
              value={opcoId}
              onChange={(event) => setOpcoId(event.target.value)}
              className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm"
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
            <span className="mb-1 block text-xs text-zinc-500">Partner</span>
            <select
              value={partnerId}
              onChange={(event) => setPartnerId(event.target.value)}
              className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm"
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
            <span className="mb-1 block text-xs text-zinc-500">Show</span>
            <select
              value={missing}
              onChange={(event) =>
                setMissing(event.target.value as MissingSideFilter | "")
              }
              className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm"
            >
              <option value="">All lanes</option>
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
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          >
            Apply
          </button>
          <button
            type="button"
            onClick={refresh}
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-100"
          >
            Refresh
          </button>
        </div>
      </section>

      {loading ? (
        <p className="text-sm text-zinc-500">Loading reports monitoring…</p>
      ) : null}
      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {!loading && !error ? (
        items.length > 0 ? (
          <>
            <div className="overflow-hidden rounded-lg border border-zinc-200">
              <table className="min-w-full divide-y divide-zinc-200 text-sm">
                <thead className="bg-zinc-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-zinc-600">
                      Period
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-zinc-600">
                      OpCo
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-zinc-600">
                      Partner
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-zinc-600">
                      OpCo report
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-zinc-600">
                      Partner report
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 bg-white">
                  {items.map((row) => (
                    <tr key={row.laneKey}>
                      <td className="px-4 py-3 text-zinc-600">
                        {formatPeriod(row.period.month, row.period.year)}
                      </td>
                      <td className="px-4 py-3 text-zinc-900">{row.opcoName}</td>
                      <td className="px-4 py-3 text-zinc-900">
                        {row.partnerName}
                      </td>
                      <td className="px-4 py-3">
                        <p className={statusClass(row.opcoReport.status)}>
                          {row.opcoReport.status}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {formatDateTime(row.opcoReport.uploadedAt)}
                        </p>
                        {row.opcoReport.reportId ? (
                          <Link
                            href={`/dizlee/reports?month=${row.period.month}&year=${row.period.year}&opcoId=${row.opcoId}&partnerId=${row.partnerId}`}
                            className="text-xs text-zinc-600 underline hover:text-zinc-900"
                          >
                            View report
                          </Link>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <p className={statusClass(row.partnerReport.status)}>
                          {row.partnerReport.status}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {formatDateTime(row.partnerReport.uploadedAt)}
                        </p>
                        {row.partnerReport.reportId ? (
                          <Link
                            href={`/dizlee/reports?month=${row.period.month}&year=${row.period.year}&opcoId=${row.opcoId}&partnerId=${row.partnerId}`}
                            className="text-xs text-zinc-600 underline hover:text-zinc-900"
                          >
                            View report
                          </Link>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between text-sm text-zinc-600">
              <p>
                Page {result.page} / {result.totalPages} · Total{" "}
                {result.totalCount} records
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={result.page <= 1}
                  onClick={() => goToPage(result.page - 1)}
                  className="rounded-md border border-zinc-300 px-3 py-1 disabled:opacity-40"
                >
                  Prev
                </button>
                <button
                  type="button"
                  disabled={result.page >= result.totalPages}
                  onClick={() => goToPage(result.page + 1)}
                  className="rounded-md border border-zinc-300 px-3 py-1 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="rounded-lg border border-zinc-200 bg-white p-8 text-center">
            <p className="font-medium text-zinc-900">No lanes match filters</p>
            <p className="mt-1 text-sm text-zinc-600">
              {summary.linkedLanes === 0
                ? "No OpCo–Partner links are configured for this scope."
                : "Try adjusting filters or select a different period."}
            </p>
          </div>
        )
      ) : null}
    </div>
  );
}

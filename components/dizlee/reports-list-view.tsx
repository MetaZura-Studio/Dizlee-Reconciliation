"use client";

import { useCallback, useEffect, useState } from "react";

import { ReportDetailModal } from "@/components/dizlee/report-detail-modal";
import { ReportsTabs } from "@/components/dizlee/reports-tabs";
import type {
  ReportDetail,
  ReportFilterOptions,
  ReportListFilters,
  ReportListItem,
  ReportListResult,
  ReportSortField,
  SortDirection,
} from "@/lib/dizlee/reports";

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

function formatDateTime(value: string): string {
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

function buildQuery(filters: ReportListFilters): string {
  const params = new URLSearchParams({
    month: String(filters.month),
    year: String(filters.year),
    sortBy: filters.sortBy,
    sortDir: filters.sortDir,
    page: String(filters.page),
  });
  if (filters.opcoId) {
    params.set("opcoId", filters.opcoId);
  }
  if (filters.partnerId) {
    params.set("partnerId", filters.partnerId);
  }
  return params.toString();
}

type ReportsListViewProps = {
  initialResult: ReportListResult;
  initialFilterOptions: ReportFilterOptions;
  fromDashboard?: boolean;
};

export function ReportsListView({
  initialResult,
  initialFilterOptions,
  fromDashboard = false,
}: ReportsListViewProps) {
  const [month, setMonth] = useState(initialResult.filters.month);
  const [year, setYear] = useState(initialResult.filters.year);
  const [opcoId, setOpcoId] = useState(initialResult.filters.opcoId ?? "");
  const [partnerId, setPartnerId] = useState(initialResult.filters.partnerId ?? "");
  const [sortBy, setSortBy] = useState<ReportSortField>(initialResult.filters.sortBy);
  const [sortDir, setSortDir] = useState<SortDirection>(initialResult.filters.sortDir);

  const [result, setResult] = useState<ReportListResult>(initialResult);
  const [filterOptions, setFilterOptions] =
    useState<ReportFilterOptions>(initialFilterOptions);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<ReportDetail | null>(null);

  const loadReports = useCallback(async (filters: ReportListFilters) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/dizlee/reports?${buildQuery(filters)}`);
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to load reports");
      }
      setResult(payload.data as ReportListResult);
      setFilterOptions(payload.filterOptions as ReportFilterOptions);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Failed to load reports",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const applyFilters = () => {
    void loadReports({
      month,
      year,
      opcoId: opcoId || undefined,
      partnerId: partnerId || undefined,
      sortBy,
      sortDir,
      page: 1,
    });
  };

  const refresh = () => {
    void loadReports({ ...result.filters, page: 1 });
  };

  useEffect(() => {
    const handleFocus = () => {
      void loadReports({ ...result.filters, page: 1 });
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [loadReports, result.filters]);

  const goToPage = (nextPage: number) => {
    void loadReports({ ...result.filters, page: nextPage });
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

  const items: ReportListItem[] = result.items;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Dizlee - Reports</h1>
        {fromDashboard ? (
          <p className="mt-1 text-xs text-zinc-500">From dashboard</p>
        ) : null}
      </div>

      <ReportsTabs active="reports" />

      <section className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
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
            <span className="mb-1 block text-xs text-zinc-500">Sort by</span>
            <select
              value={sortBy}
              onChange={(event) =>
                setSortBy(event.target.value as ReportSortField)
              }
              className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm"
            >
              <option value="uploaded">Uploaded</option>
              <option value="period">Period</option>
              <option value="filename">Filename</option>
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs text-zinc-500">Direction</span>
            <select
              value={sortDir}
              onChange={(event) =>
                setSortDir(event.target.value as SortDirection)
              }
              className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm"
            >
              <option value="desc">Desc</option>
              <option value="asc">Asc</option>
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

      {loading ? <p className="text-sm text-zinc-500">Loading reports…</p> : null}
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
                      Filename
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-zinc-600">
                      Uploaded
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-zinc-600">
                      Uploaded by
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-zinc-600">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 bg-white">
                  {items.map((row) => (
                    <tr key={row.id}>
                      <td className="px-4 py-3 text-zinc-600">
                        {formatPeriod(row.period.month, row.period.year)}
                      </td>
                      <td className="px-4 py-3 text-zinc-900">{row.opcoName}</td>
                      <td className="px-4 py-3 text-zinc-900">
                        {row.partnerName}
                      </td>
                      <td className="px-4 py-3 text-zinc-600">
                        {row.filename ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-zinc-600">
                        {formatDateTime(row.uploadedAt)}
                      </td>
                      <td className="px-4 py-3 text-zinc-600">{row.uploadedBy}</td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => void openDetail(row.id)}
                          className="text-sm text-zinc-700 underline hover:text-zinc-900"
                        >
                          View report
                        </button>
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
            <p className="font-medium text-zinc-900">No reports</p>
            <p className="mt-1 text-sm text-zinc-600">
              Try adjusting filters or upload a report as OpCo/Partner.
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

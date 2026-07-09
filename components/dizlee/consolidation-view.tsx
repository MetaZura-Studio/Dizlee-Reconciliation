"use client";

import { useCallback, useEffect, useState } from "react";

import type {
  ConsolidationDetail,
  ConsolidationHistoryResult,
  ConsolidationReadiness,
} from "@/lib/dizlee/consolidation";
import type { ReportFilterOptions } from "@/lib/dizlee/reports";

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

function formatUsd(value: number | null): string {
  if (value === null) {
    return "—";
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 4,
  }).format(value);
}

function buildReadinessQuery(month: number, year: number, opcoId: string): string {
  return new URLSearchParams({
    month: String(month),
    year: String(year),
    opcoId,
  }).toString();
}

type ConsolidationViewProps = {
  initialTab: "generate" | "history";
  initialMonth: number;
  initialYear: number;
  initialOpcoId: string;
  initialFilterOptions: ReportFilterOptions;
  initialReadiness: ConsolidationReadiness | null;
  initialHistory: ConsolidationHistoryResult;
  initialDetail: ConsolidationDetail | null;
};

export function ConsolidationView({
  initialTab,
  initialMonth,
  initialYear,
  initialOpcoId,
  initialFilterOptions,
  initialReadiness,
  initialHistory,
  initialDetail,
}: ConsolidationViewProps) {
  const [activeTab, setActiveTab] = useState<"generate" | "history">(initialTab);
  const [month, setMonth] = useState(initialMonth);
  const [year, setYear] = useState(initialYear);
  const [opcoId, setOpcoId] = useState(initialOpcoId);

  const [filterOptions, setFilterOptions] =
    useState<ReportFilterOptions>(initialFilterOptions);
  const [readiness, setReadiness] = useState<ConsolidationReadiness | null>(
    initialReadiness,
  );
  const [history, setHistory] = useState(initialHistory);
  const [detail, setDetail] = useState<ConsolidationDetail | null>(initialDetail);

  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadReadiness = useCallback(
    async (nextMonth: number, nextYear: number, nextOpcoId: string) => {
      if (!nextOpcoId) {
        setReadiness(null);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/dizlee/consolidation/readiness?${buildReadinessQuery(nextMonth, nextYear, nextOpcoId)}`,
        );
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error ?? "Failed to load readiness");
        }
        setReadiness(payload.data as ConsolidationReadiness);
        if (payload.filterOptions) {
          setFilterOptions(payload.filterOptions as ReportFilterOptions);
        }
      } catch (loadError) {
        setError(
          loadError instanceof Error ? loadError.message : "Failed to load readiness",
        );
        setReadiness(null);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const loadHistory = useCallback(
    async (page = 1, historyMonth = month, historyYear = year, historyOpcoId = opcoId) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ page: String(page) });
        if (historyMonth) {
          params.set("month", String(historyMonth));
        }
        if (historyYear) {
          params.set("year", String(historyYear));
        }
        if (historyOpcoId) {
          params.set("opcoId", historyOpcoId);
        }

        const response = await fetch(`/api/dizlee/consolidation/history?${params}`);
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error ?? "Failed to load history");
        }
        setHistory(payload.data as ConsolidationHistoryResult);
      } catch (loadError) {
        setError(
          loadError instanceof Error ? loadError.message : "Failed to load history",
        );
      } finally {
        setLoading(false);
      }
    },
    [month, opcoId, year],
  );

  const loadDetail = useCallback(async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/dizlee/consolidation/${id}`);
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to load consolidation");
      }
      setDetail(payload.data as ConsolidationDetail);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Failed to load consolidation",
      );
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const applyGenerateFilters = () => {
    void loadReadiness(month, year, opcoId);
  };

  const runGenerate = async () => {
    if (!opcoId) {
      setError("Select an OpCo first.");
      return;
    }

    setGenerating(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/dizlee/consolidation/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, year, opcoId }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to generate consolidation");
      }

      setMessage(payload.data.message as string);
      await Promise.all([
        loadReadiness(month, year, opcoId),
        loadDetail(payload.data.id as number),
        loadHistory(1),
      ]);
    } catch (generateError) {
      setError(
        generateError instanceof Error
          ? generateError.message
          : "Failed to generate consolidation",
      );
    } finally {
      setGenerating(false);
    }
  };

  const downloadExcel = (id: number) => {
    window.location.href = `/api/dizlee/consolidation/${id}/export`;
  };

  useEffect(() => {
    const handleFocus = () => {
      if (activeTab === "generate" && opcoId) {
        void loadReadiness(month, year, opcoId);
      } else if (activeTab === "history") {
        void loadHistory(history.page);
      }
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [activeTab, history.page, loadHistory, loadReadiness, month, opcoId, year]);

  const yearOptions = [];
  for (let value = year + 1; value >= year - 4; value -= 1) {
    yearOptions.push(value);
  }

  const canGenerate = Boolean(readiness?.ready && opcoId);
  const isRegenerate = Boolean(readiness?.existingConsolidationId);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Consolidation</h1>
        <p className="mt-1 text-sm text-foreground-subtle">
          Generate OpCo monthly consolidations from uploaded OpCo reports and export
          Excel.
        </p>
      </div>

      <div className="border-b border-border">
        <nav className="-mb-px flex gap-6">
          {[
            { id: "generate" as const, label: "Generate" },
            { id: "history" as const, label: "History" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id);
                if (tab.id === "history") {
                  void loadHistory(1);
                }
              }}
              className={`border-b-2 px-1 pb-3 text-sm font-medium ${
                activeTab === tab.id
                  ? "border-primary text-foreground"
                  : "border-transparent text-foreground-subtle hover:text-foreground-muted"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {error ? (
        <div className="rounded-lg border border-danger-border bg-danger-muted px-4 py-3 text-sm text-danger">
          {error}
        </div>
      ) : null}

      {message ? (
        <div className="rounded-lg border border-success-border bg-success-muted px-4 py-3 text-sm text-success">
          {message}
        </div>
      ) : null}

      {activeTab === "generate" ? (
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-surface p-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <label className="block text-sm">
                <span className="text-foreground-muted">Month</span>
                <select
                  value={month}
                  onChange={(event) => setMonth(Number(event.target.value))}
                  className="mt-1 w-full rounded-lg border border-border-strong px-3 py-2"
                >
                  {MONTHS.map((label, index) => (
                    <option key={label} value={index + 1}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm">
                <span className="text-foreground-muted">Year</span>
                <select
                  value={year}
                  onChange={(event) => setYear(Number(event.target.value))}
                  className="mt-1 w-full rounded-lg border border-border-strong px-3 py-2"
                >
                  {yearOptions.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm sm:col-span-2">
                <span className="text-foreground-muted">OpCo</span>
                <select
                  value={opcoId}
                  onChange={(event) => setOpcoId(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-border-strong px-3 py-2"
                >
                  <option value="">Select OpCo</option>
                  {filterOptions.opcos.map((opco) => (
                    <option key={opco.id} value={opco.id}>
                      {opco.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={applyGenerateFilters}
                disabled={!opcoId || loading}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
              >
                Check readiness
              </button>
              <button
                type="button"
                onClick={() => void runGenerate()}
                disabled={!canGenerate || generating}
                className="rounded-lg border border-border-strong px-4 py-2 text-sm font-medium text-foreground disabled:opacity-50"
              >
                {generating
                  ? "Working…"
                  : isRegenerate
                    ? "Regenerate consolidation"
                    : "Generate consolidation"}
              </button>
            </div>
          </div>

          {readiness ? (
            <div className="rounded-xl border border-border bg-surface p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-medium text-foreground">
                    {readiness.opcoName} — {readiness.period.label}
                  </h2>
                  <p className="mt-1 text-sm text-foreground-subtle">
                    {readiness.linkedCount} linked partner
                    {readiness.linkedCount === 1 ? "" : "s"}
                    {readiness.existingConsolidationId
                      ? " · Existing consolidation will be replaced on regenerate"
                      : ""}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    readiness.ready
                      ? "bg-success-muted text-success"
                      : "bg-warning-muted text-warning"
                  }`}
                >
                  {readiness.ready ? "Ready to generate" : "Not ready"}
                </span>
              </div>

              {readiness.missingPartners.length > 0 ? (
                <p className="mt-3 text-sm text-warning">
                  Missing OpCo reports or line items for:{" "}
                  {readiness.missingPartners.join(", ")}
                </p>
              ) : null}

              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-border text-foreground-subtle">
                    <tr>
                      <th className="px-3 py-2 font-medium">Partner</th>
                      <th className="px-3 py-2 font-medium">OpCo report</th>
                      <th className="px-3 py-2 font-medium">Line items</th>
                    </tr>
                  </thead>
                  <tbody>
                    {readiness.partners.map((partner) => (
                      <tr key={partner.partnerId} className="border-b border-border">
                        <td className="px-3 py-2 text-foreground">{partner.partnerName}</td>
                        <td className="px-3 py-2">
                          {partner.hasReport ? (
                            <span className="text-success">Uploaded</span>
                          ) : (
                            <span className="text-warning">Missing</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-foreground-muted">
                          {partner.lineItemCount}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {detail ? (
            <div className="rounded-xl border border-border bg-surface p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-medium text-foreground">
                    Latest detail — {detail.opcoName}
                  </h2>
                  <p className="mt-1 text-sm text-foreground-subtle">
                    Generated {formatDateTime(detail.generatedAt)} by {detail.runBy}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => downloadExcel(detail.id)}
                  className="rounded-lg border border-border-strong px-3 py-1.5 text-sm font-medium text-foreground"
                >
                  Download Excel
                </button>
              </div>

              <p className="mt-3 text-sm text-foreground-muted">
                Total USD: {formatUsd(detail.totalAmountUsd)}
              </p>

              <div className="mt-4 max-h-80 overflow-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="sticky top-0 border-b border-border bg-surface text-foreground-subtle">
                    <tr>
                      <th className="px-3 py-2 font-medium">Partner</th>
                      <th className="px-3 py-2 font-medium">Service</th>
                      <th className="px-3 py-2 font-medium">Description</th>
                      <th className="px-3 py-2 font-medium text-right">Usage</th>
                      <th className="px-3 py-2 font-medium text-right">USD</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.items.map((item, index) => (
                      <tr
                        key={`${item.partnerName}-${item.serviceCode}-${index}`}
                        className="border-b border-border"
                      >
                        <td className="px-3 py-2 text-foreground">{item.partnerName}</td>
                        <td className="px-3 py-2 text-foreground-muted">
                          {item.serviceCode ?? "—"}
                        </td>
                        <td className="px-3 py-2 text-foreground-muted">{item.description}</td>
                        <td className="px-3 py-2 text-right text-foreground-muted">
                          {formatNumber(item.usageAmount)}
                          {item.usageUnit ? ` ${item.usageUnit}` : ""}
                        </td>
                        <td className="px-3 py-2 text-right text-foreground-muted">
                          {formatUsd(item.usageUsd)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-surface p-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <label className="block text-sm">
                <span className="text-foreground-muted">Month</span>
                <select
                  value={month}
                  onChange={(event) => setMonth(Number(event.target.value))}
                  className="mt-1 w-full rounded-lg border border-border-strong px-3 py-2"
                >
                  {MONTHS.map((label, index) => (
                    <option key={label} value={index + 1}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm">
                <span className="text-foreground-muted">Year</span>
                <select
                  value={year}
                  onChange={(event) => setYear(Number(event.target.value))}
                  className="mt-1 w-full rounded-lg border border-border-strong px-3 py-2"
                >
                  {yearOptions.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm sm:col-span-2">
                <span className="text-foreground-muted">OpCo</span>
                <select
                  value={opcoId}
                  onChange={(event) => setOpcoId(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-border-strong px-3 py-2"
                >
                  <option value="">All OpCos</option>
                  {filterOptions.opcos.map((opco) => (
                    <option key={opco.id} value={opco.id}>
                      {opco.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <button
              type="button"
              onClick={() => void loadHistory(1)}
              disabled={loading}
              className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              Apply filters
            </button>
          </div>

          <div className="overflow-hidden rounded-xl border border-border bg-surface">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-border bg-surface-muted text-foreground-subtle">
                <tr>
                  <th className="px-4 py-3 font-medium">Period</th>
                  <th className="px-4 py-3 font-medium">OpCo</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Total USD</th>
                  <th className="px-4 py-3 font-medium text-right">Items</th>
                  <th className="px-4 py-3 font-medium">Generated</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {history.items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-foreground-subtle">
                      No consolidations found for the selected filters.
                    </td>
                  </tr>
                ) : (
                  history.items.map((item) => (
                    <tr key={item.id} className="border-b border-border">
                      <td className="px-4 py-3 text-foreground">
                        {formatPeriod(item.period.month, item.period.year)}
                      </td>
                      <td className="px-4 py-3 text-foreground">{item.opcoName}</td>
                      <td className="px-4 py-3 text-foreground-muted">{item.status}</td>
                      <td className="px-4 py-3 text-right text-foreground-muted">
                        {formatUsd(item.totalAmountUsd)}
                      </td>
                      <td className="px-4 py-3 text-right text-foreground-muted">
                        {item.itemCount}
                      </td>
                      <td className="px-4 py-3 text-foreground-muted">
                        <div>{formatDateTime(item.generatedAt)}</div>
                        <div className="text-xs text-foreground-subtle">by {item.runBy}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => void loadDetail(item.id)}
                            className="text-sm font-medium text-foreground underline"
                          >
                            View
                          </button>
                          <button
                            type="button"
                            onClick={() => downloadExcel(item.id)}
                            className="text-sm font-medium text-foreground underline"
                          >
                            Excel
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {history.totalPages > 1 ? (
            <div className="flex items-center justify-between text-sm text-foreground-muted">
              <span>
                Page {history.page} of {history.totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={history.page <= 1 || loading}
                  onClick={() => void loadHistory(history.page - 1)}
                  className="rounded-lg border border-border-strong px-3 py-1 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={history.page >= history.totalPages || loading}
                  onClick={() => void loadHistory(history.page + 1)}
                  className="rounded-lg border border-border-strong px-3 py-1 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          ) : null}

          {detail ? (
            <div className="rounded-xl border border-border bg-surface p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-medium text-foreground">
                    {detail.opcoName} — {detail.period.label}
                  </h2>
                  <p className="mt-1 text-sm text-foreground-subtle">
                    {detail.status} · Generated {formatDateTime(detail.generatedAt)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => downloadExcel(detail.id)}
                  className="rounded-lg border border-border-strong px-3 py-1.5 text-sm font-medium text-foreground"
                >
                  Download Excel
                </button>
              </div>

              <p className="mt-3 text-sm text-foreground-muted">
                Total USD: {formatUsd(detail.totalAmountUsd)}
              </p>

              <div className="mt-4 max-h-96 overflow-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="sticky top-0 border-b border-border bg-surface text-foreground-subtle">
                    <tr>
                      <th className="px-3 py-2 font-medium">Partner</th>
                      <th className="px-3 py-2 font-medium">Service</th>
                      <th className="px-3 py-2 font-medium">Description</th>
                      <th className="px-3 py-2 font-medium text-right">Usage</th>
                      <th className="px-3 py-2 font-medium text-right">USD</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.items.map((item, index) => (
                      <tr
                        key={`${item.partnerName}-${item.serviceCode}-${index}`}
                        className="border-b border-border"
                      >
                        <td className="px-3 py-2 text-foreground">{item.partnerName}</td>
                        <td className="px-3 py-2 text-foreground-muted">
                          {item.serviceCode ?? "—"}
                        </td>
                        <td className="px-3 py-2 text-foreground-muted">{item.description}</td>
                        <td className="px-3 py-2 text-right text-foreground-muted">
                          {formatNumber(item.usageAmount)}
                          {item.usageUnit ? ` ${item.usageUnit}` : ""}
                        </td>
                        <td className="px-3 py-2 text-right text-foreground-muted">
                          {formatUsd(item.usageUsd)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

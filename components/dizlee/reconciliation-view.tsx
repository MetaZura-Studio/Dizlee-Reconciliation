"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import type { ReportFilterOptions } from "@/lib/dizlee/reports";
import type {
  CompareLaneFilters,
  CompareLaneRow,
  ReconciliationDetail,
  ReconciliationHistoryResult,
  ReconciliationSearchBy,
} from "@/lib/dizlee/reconciliation";

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

function stateClass(state: CompareLaneRow["state"]): string {
  switch (state) {
    case "READY":
      return "text-success";
    case "RECONCILED":
      return "text-accent";
    case "NO_OPCO_REPORT":
    case "NO_PARTNER_REPORT":
    case "MISSING":
      return "text-warning";
    default:
      return "text-foreground-muted";
  }
}

function buildLaneQuery(filters: CompareLaneFilters): string {
  const params = new URLSearchParams({
    month: String(filters.month),
    year: String(filters.year),
    searchBy: filters.searchBy,
  });
  if (filters.entityId) {
    params.set("entityId", filters.entityId);
  }
  return params.toString();
}

type ReconciliationViewProps = {
  initialTab: "compare" | "history";
  initialCompareFilters: CompareLaneFilters;
  initialLanes: CompareLaneRow[];
  initialFilterOptions: ReportFilterOptions;
  initialTolerancePercent: number;
  initialHistory: ReconciliationHistoryResult;
  initialDetail: ReconciliationDetail | null;
};

export function ReconciliationView({
  initialTab,
  initialCompareFilters,
  initialLanes,
  initialFilterOptions,
  initialTolerancePercent,
  initialHistory,
  initialDetail,
}: ReconciliationViewProps) {
  const [activeTab, setActiveTab] = useState<"compare" | "history">(initialTab);
  const [month, setMonth] = useState(initialCompareFilters.month);
  const [year, setYear] = useState(initialCompareFilters.year);
  const [searchBy, setSearchBy] = useState<ReconciliationSearchBy>(
    initialCompareFilters.searchBy,
  );
  const [entityId, setEntityId] = useState(initialCompareFilters.entityId ?? "");

  const [lanes, setLanes] = useState(initialLanes);
  const [filterOptions, setFilterOptions] =
    useState<ReportFilterOptions>(initialFilterOptions);
  const [tolerancePercent, setTolerancePercent] = useState(
    initialTolerancePercent,
  );
  const [history, setHistory] = useState(initialHistory);
  const [detail, setDetail] = useState<ReconciliationDetail | null>(initialDetail);

  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadLanes = useCallback(async (filters: CompareLaneFilters) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/dizlee/reconciliation/lanes?${buildLaneQuery(filters)}`,
      );
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to load lanes");
      }
      setLanes(payload.data as CompareLaneRow[]);
      setFilterOptions(payload.filterOptions as ReportFilterOptions);
      setTolerancePercent(payload.tolerancePercent as number);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Failed to load lanes",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const loadHistory = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/dizlee/reconciliation/history?page=${page}`);
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to load history");
      }
      setHistory(payload.data as ReconciliationHistoryResult);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Failed to load history",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDetail = useCallback(async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/dizlee/reconciliation/${id}`);
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to load reconciliation");
      }
      setDetail(payload.data as ReconciliationDetail);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load reconciliation",
      );
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const applyCompareFilters = () => {
    void loadLanes({
      month,
      year,
      searchBy,
      entityId: entityId || undefined,
    });
  };

  const runReconciliation = async (lane: CompareLaneRow) => {
    const key = `${lane.opcoId}-${lane.partnerId}`;
    setActionId(key);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/dizlee/reconciliation/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month: lane.period.month,
          year: lane.period.year,
          opcoId: lane.opcoId,
          partnerId: lane.partnerId,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to run reconciliation");
      }
      setMessage(payload.data.message as string);
      await Promise.all([
        loadLanes({ month, year, searchBy, entityId: entityId || undefined }),
        loadDetail(payload.data.id as number),
      ]);
      setActiveTab("compare");
    } catch (runError) {
      setError(
        runError instanceof Error ? runError.message : "Failed to run reconciliation",
      );
    } finally {
      setActionId(null);
    }
  };

  const confirmReconciliation = async () => {
    if (!detail) {
      return;
    }

    setActionId(String(detail.id));
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(
        `/api/dizlee/reconciliation/${detail.id}/confirm`,
        { method: "PATCH" },
      );
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to confirm reconciliation");
      }
      setMessage("Reconciliation confirmed.");
      await Promise.all([
        loadDetail(detail.id),
        loadLanes({ month, year, searchBy, entityId: entityId || undefined }),
        loadHistory(history.page),
      ]);
    } catch (confirmError) {
      setError(
        confirmError instanceof Error
          ? confirmError.message
          : "Failed to confirm reconciliation",
      );
    } finally {
      setActionId(null);
    }
  };

  useEffect(() => {
    const handleFocus = () => {
      if (activeTab === "compare") {
        void loadLanes({ month, year, searchBy, entityId: entityId || undefined });
      } else {
        void loadHistory(history.page);
      }
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [activeTab, entityId, history.page, loadHistory, loadLanes, month, searchBy, year]);

  const yearOptions = [];
  for (let value = year + 1; value >= year - 4; value -= 1) {
    yearOptions.push(value);
  }

  const entityOptions =
    searchBy === "opco" ? filterOptions.opcos : filterOptions.partners;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Reconciliation</h1>
        <p className="mt-1 text-sm text-foreground-subtle">
          Compare OpCo and Partner reports per lane. Tolerance: {tolerancePercent}%
        </p>
      </div>

      <div className="border-b border-border">
        <nav className="-mb-px flex gap-6">
          {[
            { id: "compare" as const, label: "Compare Reports" },
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

      {message ? (
        <div className="rounded-md border border-success-border bg-success-muted p-4 text-sm text-success">
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-md border border-danger-border bg-danger-muted p-4 text-sm text-danger">
          {error}
        </div>
      ) : null}

      {activeTab === "compare" ? (
        <>
          <section className="rounded-lg border border-border bg-surface-muted p-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
                <span className="mb-1 block text-xs text-foreground-subtle">Search by</span>
                <select
                  value={searchBy}
                  onChange={(event) => {
                    setSearchBy(event.target.value as ReconciliationSearchBy);
                    setEntityId("");
                  }}
                  className="w-full rounded-md border border-border-strong px-3 py-1.5 text-sm"
                >
                  <option value="opco">OpCo reports</option>
                  <option value="partner">Partner reports</option>
                </select>
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-xs text-foreground-subtle">
                  {searchBy === "opco" ? "OpCo" : "Partner"}
                </span>
                <select
                  value={entityId}
                  onChange={(event) => setEntityId(event.target.value)}
                  className="w-full rounded-md border border-border-strong px-3 py-1.5 text-sm"
                >
                  <option value="">All</option>
                  {entityOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="mt-4">
              <button
                type="button"
                onClick={applyCompareFilters}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
              >
                Apply
              </button>
            </div>
          </section>

          {loading ? <p className="text-sm text-foreground-subtle">Loading lanes…</p> : null}

          {!loading ? (
            lanes.length > 0 ? (
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
                      <th className="px-4 py-3 text-left font-medium text-foreground-muted">
                        State
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-foreground-muted">
                        Outcome
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-foreground-muted">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-surface">
                    {lanes.map((lane) => {
                      const key = `${lane.opcoId}-${lane.partnerId}`;
                      const busy = actionId === key;
                      return (
                        <tr key={key}>
                          <td className="px-4 py-3 text-foreground-muted">
                            {formatPeriod(lane.period.month, lane.period.year)}
                          </td>
                          <td className="px-4 py-3 text-foreground">{lane.opcoName}</td>
                          <td className="px-4 py-3 text-foreground">
                            {lane.partnerName}
                          </td>
                          <td className="px-4 py-3 text-foreground-muted">
                            {lane.opcoReportFilename ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-foreground-muted">
                            {lane.partnerReportFilename ?? "—"}
                          </td>
                          <td className={`px-4 py-3 ${stateClass(lane.state)}`}>
                            {lane.state.replaceAll("_", " ")}
                          </td>
                          <td className="px-4 py-3 text-foreground-muted">
                            {lane.outcome ?? "—"}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              {lane.canRun ? (
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => void runReconciliation(lane)}
                                  className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-40"
                                >
                                  Run reconciliation
                                </button>
                              ) : null}
                              {lane.reconciliationId ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    void loadDetail(Number(lane.reconciliationId))
                                  }
                                  className="rounded-md border border-border-strong px-3 py-1 text-xs text-foreground-muted hover:bg-surface-muted"
                                >
                                  View
                                </button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="rounded-lg border border-border bg-surface p-8 text-center">
                <p className="font-medium text-foreground">No lanes found</p>
                <p className="mt-1 text-sm text-foreground-muted">
                  Adjust period or search filters to see linked OpCo–Partner lanes.
                </p>
              </div>
            )
          ) : null}
        </>
      ) : (
        <>
          {loading ? <p className="text-sm text-foreground-subtle">Loading history…</p> : null}
          {!loading && history.items.length > 0 ? (
            <>
              <div className="overflow-hidden rounded-lg border border-border">
                <table className="min-w-full divide-y divide-border text-sm">
                  <thead className="bg-surface-muted">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-foreground-muted">
                        Period
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-foreground-muted">
                        Lane
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-foreground-muted">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-foreground-muted">
                        Matched
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-foreground-muted">
                        Unmatched
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-foreground-muted">
                        Run at
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-foreground-muted">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-surface">
                    {history.items.map((row) => (
                      <tr key={row.id}>
                        <td className="px-4 py-3 text-foreground-muted">
                          {formatPeriod(row.period.month, row.period.year)}
                        </td>
                        <td className="px-4 py-3 text-foreground">{row.lane}</td>
                        <td className="px-4 py-3 text-foreground-muted">{row.status}</td>
                        <td className="px-4 py-3 text-foreground-muted">
                          {row.matchedCount}
                        </td>
                        <td className="px-4 py-3 text-foreground-muted">
                          {row.unmatchedCount}
                        </td>
                        <td className="px-4 py-3 text-foreground-muted">
                          {formatDateTime(row.runAt)}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => void loadDetail(row.id)}
                            className="text-sm text-foreground-muted underline hover:text-foreground"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between text-sm text-foreground-muted">
                <p>
                  Page {history.page} / {history.totalPages} · Total{" "}
                  {history.totalCount} records
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={history.page <= 1}
                    onClick={() => void loadHistory(history.page - 1)}
                    className="rounded-md border border-border-strong px-3 py-1 disabled:opacity-40"
                  >
                    Prev
                  </button>
                  <button
                    type="button"
                    disabled={history.page >= history.totalPages}
                    onClick={() => void loadHistory(history.page + 1)}
                    className="rounded-md border border-border-strong px-3 py-1 disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          ) : !loading ? (
            <div className="rounded-lg border border-border bg-surface p-8 text-center">
              <p className="font-medium text-foreground">No reconciliation history</p>
              <p className="mt-1 text-sm text-foreground-muted">
                Run reconciliation on a ready lane to see results here.
              </p>
            </div>
          ) : null}
        </>
      )}

      {detail ? (
        <section className="space-y-4 rounded-lg border border-border bg-surface p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-medium text-foreground">
                {detail.opcoName} / {detail.partnerName}
              </h2>
              <p className="text-sm text-foreground-subtle">
                {formatPeriod(detail.period.month, detail.period.year)} ·{" "}
                {detail.status}
              </p>
              <p className="mt-1 text-xs text-foreground-subtle">
                OpCo file: {detail.opcoReportFilename ?? "—"} · Partner file:{" "}
                {detail.partnerReportFilename ?? "—"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setDetail(null)}
              className="text-sm text-foreground-subtle hover:text-foreground"
            >
              Close
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-4">
            <div className="rounded-md border border-border p-3 text-sm">
              <p className="text-xs text-foreground-subtle">Matched</p>
              <p className="font-medium text-foreground">{detail.matchedCount}</p>
            </div>
            <div className="rounded-md border border-border p-3 text-sm">
              <p className="text-xs text-foreground-subtle">Unmatched</p>
              <p className="font-medium text-foreground">{detail.unmatchedCount}</p>
            </div>
            <div className="rounded-md border border-border p-3 text-sm">
              <p className="text-xs text-foreground-subtle">Total variance</p>
              <p className="font-medium text-foreground">
                {formatUsd(detail.totalVariance)}
              </p>
            </div>
            <div className="rounded-md border border-border p-3 text-sm">
              <p className="text-xs text-foreground-subtle">Tolerance</p>
              <p className="font-medium text-foreground">{detail.tolerancePercent}%</p>
            </div>
          </div>

          {detail.canConfirm ? (
            <button
              type="button"
              disabled={actionId === String(detail.id)}
              onClick={() => void confirmReconciliation()}
              className="rounded-md bg-success px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-success/90 disabled:opacity-40"
            >
              Confirm reconciliation
            </button>
          ) : null}

          <div className="overflow-hidden rounded-lg border border-border">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="bg-surface-muted">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-foreground-muted">
                    Service
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-foreground-muted">
                    OpCo (USD)
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-foreground-muted">
                    Partner (USD)
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-foreground-muted">
                    Variance
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-foreground-muted">
                    Confirmed
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-foreground-muted">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-surface">
                {detail.items.map((item) => (
                  <tr key={item.serviceCode}>
                    <td className="px-4 py-3 text-foreground">
                      {item.description ?? item.serviceCode}
                    </td>
                    <td className="px-4 py-3 text-foreground-muted">
                      {formatUsd(item.opcoAmount)}
                    </td>
                    <td className="px-4 py-3 text-foreground-muted">
                      {formatUsd(item.partnerAmount)}
                    </td>
                    <td className="px-4 py-3 text-foreground-muted">
                      {formatUsd(item.varianceAmount)}
                    </td>
                    <td className="px-4 py-3 text-foreground-muted">
                      {formatUsd(item.confirmedValue)}
                    </td>
                    <td className="px-4 py-3 text-foreground-muted">{item.matchStatus}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-foreground-subtle">
            Run at {formatDateTime(detail.runAt)} ·{" "}
            <Link
              href={`/dizlee/reconciliation?id=${detail.id}`}
              className="underline"
            >
              Permalink
            </Link>
          </p>
        </section>
      ) : null}
    </div>
  );
}

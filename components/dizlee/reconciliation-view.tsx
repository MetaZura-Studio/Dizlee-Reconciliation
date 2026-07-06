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
      return "text-emerald-700";
    case "RECONCILED":
      return "text-blue-700";
    case "NO_OPCO_REPORT":
    case "NO_PARTNER_REPORT":
    case "MISSING":
      return "text-amber-700";
    default:
      return "text-zinc-700";
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
        <h1 className="text-2xl font-semibold text-zinc-900">Reconciliation</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Compare OpCo and Partner reports per lane. Tolerance: {tolerancePercent}%
        </p>
      </div>

      <div className="border-b border-zinc-200">
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
                  ? "border-zinc-900 text-zinc-900"
                  : "border-transparent text-zinc-500 hover:text-zinc-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {message ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {activeTab === "compare" ? (
        <>
          <section className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
                <span className="mb-1 block text-xs text-zinc-500">Search by</span>
                <select
                  value={searchBy}
                  onChange={(event) => {
                    setSearchBy(event.target.value as ReconciliationSearchBy);
                    setEntityId("");
                  }}
                  className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm"
                >
                  <option value="opco">OpCo reports</option>
                  <option value="partner">Partner reports</option>
                </select>
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-xs text-zinc-500">
                  {searchBy === "opco" ? "OpCo" : "Partner"}
                </span>
                <select
                  value={entityId}
                  onChange={(event) => setEntityId(event.target.value)}
                  className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm"
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
                className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
              >
                Apply
              </button>
            </div>
          </section>

          {loading ? <p className="text-sm text-zinc-500">Loading lanes…</p> : null}

          {!loading ? (
            lanes.length > 0 ? (
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
                      <th className="px-4 py-3 text-left font-medium text-zinc-600">
                        State
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-zinc-600">
                        Outcome
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-zinc-600">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 bg-white">
                    {lanes.map((lane) => {
                      const key = `${lane.opcoId}-${lane.partnerId}`;
                      const busy = actionId === key;
                      return (
                        <tr key={key}>
                          <td className="px-4 py-3 text-zinc-600">
                            {formatPeriod(lane.period.month, lane.period.year)}
                          </td>
                          <td className="px-4 py-3 text-zinc-900">{lane.opcoName}</td>
                          <td className="px-4 py-3 text-zinc-900">
                            {lane.partnerName}
                          </td>
                          <td className="px-4 py-3 text-zinc-600">
                            {lane.opcoReportFilename ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-zinc-600">
                            {lane.partnerReportFilename ?? "—"}
                          </td>
                          <td className={`px-4 py-3 ${stateClass(lane.state)}`}>
                            {lane.state.replaceAll("_", " ")}
                          </td>
                          <td className="px-4 py-3 text-zinc-600">
                            {lane.outcome ?? "—"}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              {lane.canRun ? (
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => void runReconciliation(lane)}
                                  className="rounded-md bg-zinc-900 px-3 py-1 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-40"
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
                                  className="rounded-md border border-zinc-300 px-3 py-1 text-xs text-zinc-700 hover:bg-zinc-100"
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
              <div className="rounded-lg border border-zinc-200 bg-white p-8 text-center">
                <p className="font-medium text-zinc-900">No lanes found</p>
                <p className="mt-1 text-sm text-zinc-600">
                  Adjust period or search filters to see linked OpCo–Partner lanes.
                </p>
              </div>
            )
          ) : null}
        </>
      ) : (
        <>
          {loading ? <p className="text-sm text-zinc-500">Loading history…</p> : null}
          {!loading && history.items.length > 0 ? (
            <>
              <div className="overflow-hidden rounded-lg border border-zinc-200">
                <table className="min-w-full divide-y divide-zinc-200 text-sm">
                  <thead className="bg-zinc-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-zinc-600">
                        Period
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-zinc-600">
                        Lane
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-zinc-600">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-zinc-600">
                        Matched
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-zinc-600">
                        Unmatched
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-zinc-600">
                        Run at
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-zinc-600">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 bg-white">
                    {history.items.map((row) => (
                      <tr key={row.id}>
                        <td className="px-4 py-3 text-zinc-600">
                          {formatPeriod(row.period.month, row.period.year)}
                        </td>
                        <td className="px-4 py-3 text-zinc-900">{row.lane}</td>
                        <td className="px-4 py-3 text-zinc-600">{row.status}</td>
                        <td className="px-4 py-3 text-zinc-600">
                          {row.matchedCount}
                        </td>
                        <td className="px-4 py-3 text-zinc-600">
                          {row.unmatchedCount}
                        </td>
                        <td className="px-4 py-3 text-zinc-600">
                          {formatDateTime(row.runAt)}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => void loadDetail(row.id)}
                            className="text-sm text-zinc-700 underline hover:text-zinc-900"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between text-sm text-zinc-600">
                <p>
                  Page {history.page} / {history.totalPages} · Total{" "}
                  {history.totalCount} records
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={history.page <= 1}
                    onClick={() => void loadHistory(history.page - 1)}
                    className="rounded-md border border-zinc-300 px-3 py-1 disabled:opacity-40"
                  >
                    Prev
                  </button>
                  <button
                    type="button"
                    disabled={history.page >= history.totalPages}
                    onClick={() => void loadHistory(history.page + 1)}
                    className="rounded-md border border-zinc-300 px-3 py-1 disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          ) : !loading ? (
            <div className="rounded-lg border border-zinc-200 bg-white p-8 text-center">
              <p className="font-medium text-zinc-900">No reconciliation history</p>
              <p className="mt-1 text-sm text-zinc-600">
                Run reconciliation on a ready lane to see results here.
              </p>
            </div>
          ) : null}
        </>
      )}

      {detail ? (
        <section className="space-y-4 rounded-lg border border-zinc-200 bg-white p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-medium text-zinc-900">
                {detail.opcoName} / {detail.partnerName}
              </h2>
              <p className="text-sm text-zinc-500">
                {formatPeriod(detail.period.month, detail.period.year)} ·{" "}
                {detail.status}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                OpCo file: {detail.opcoReportFilename ?? "—"} · Partner file:{" "}
                {detail.partnerReportFilename ?? "—"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setDetail(null)}
              className="text-sm text-zinc-500 hover:text-zinc-900"
            >
              Close
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-4">
            <div className="rounded-md border border-zinc-200 p-3 text-sm">
              <p className="text-xs text-zinc-500">Matched</p>
              <p className="font-medium text-zinc-900">{detail.matchedCount}</p>
            </div>
            <div className="rounded-md border border-zinc-200 p-3 text-sm">
              <p className="text-xs text-zinc-500">Unmatched</p>
              <p className="font-medium text-zinc-900">{detail.unmatchedCount}</p>
            </div>
            <div className="rounded-md border border-zinc-200 p-3 text-sm">
              <p className="text-xs text-zinc-500">Total variance</p>
              <p className="font-medium text-zinc-900">
                {formatUsd(detail.totalVariance)}
              </p>
            </div>
            <div className="rounded-md border border-zinc-200 p-3 text-sm">
              <p className="text-xs text-zinc-500">Tolerance</p>
              <p className="font-medium text-zinc-900">{detail.tolerancePercent}%</p>
            </div>
          </div>

          {detail.canConfirm ? (
            <button
              type="button"
              disabled={actionId === String(detail.id)}
              onClick={() => void confirmReconciliation()}
              className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-40"
            >
              Confirm reconciliation
            </button>
          ) : null}

          <div className="overflow-hidden rounded-lg border border-zinc-200">
            <table className="min-w-full divide-y divide-zinc-200 text-sm">
              <thead className="bg-zinc-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-zinc-600">
                    Service
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-600">
                    OpCo (USD)
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-600">
                    Partner (USD)
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-600">
                    Variance
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-600">
                    Confirmed
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-600">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 bg-white">
                {detail.items.map((item) => (
                  <tr key={item.serviceCode}>
                    <td className="px-4 py-3 text-zinc-900">
                      {item.description ?? item.serviceCode}
                    </td>
                    <td className="px-4 py-3 text-zinc-600">
                      {formatUsd(item.opcoAmount)}
                    </td>
                    <td className="px-4 py-3 text-zinc-600">
                      {formatUsd(item.partnerAmount)}
                    </td>
                    <td className="px-4 py-3 text-zinc-600">
                      {formatUsd(item.varianceAmount)}
                    </td>
                    <td className="px-4 py-3 text-zinc-600">
                      {formatUsd(item.confirmedValue)}
                    </td>
                    <td className="px-4 py-3 text-zinc-600">{item.matchStatus}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-zinc-500">
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

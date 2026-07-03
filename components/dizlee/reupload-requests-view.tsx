"use client";

import { useCallback, useEffect, useState } from "react";

import { ReportsTabs } from "@/components/dizlee/reports-tabs";
import type { ReportFilterOptions } from "@/lib/dizlee/reports";
import type {
  ReuploadListFilters,
  ReuploadListResult,
  ReuploadRequestItem,
} from "@/lib/dizlee/reupload-requests";

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

function buildQuery(filters: ReuploadListFilters): string {
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
  return params.toString();
}

type ReuploadRequestsViewProps = {
  initialResult: ReuploadListResult;
  initialFilterOptions: ReportFilterOptions;
};

export function ReuploadRequestsView({
  initialResult,
  initialFilterOptions,
}: ReuploadRequestsViewProps) {
  const [month, setMonth] = useState(initialResult.filters.month);
  const [year, setYear] = useState(initialResult.filters.year);
  const [opcoId, setOpcoId] = useState(initialResult.filters.opcoId ?? "");
  const [partnerId, setPartnerId] = useState(
    initialResult.filters.partnerId ?? "",
  );

  const [result, setResult] = useState<ReuploadListResult>(initialResult);
  const [filterOptions, setFilterOptions] =
    useState<ReportFilterOptions>(initialFilterOptions);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<ReuploadRequestItem | null>(
    null,
  );
  const [decisionNote, setDecisionNote] = useState("");

  const loadRequests = useCallback(async (filters: ReuploadListFilters) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/dizlee/reupload-requests?${buildQuery(filters)}`,
      );
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to load reupload requests");
      }
      setResult(payload.data as ReuploadListResult);
      setFilterOptions(payload.filterOptions as ReportFilterOptions);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load reupload requests",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const applyFilters = () => {
    void loadRequests({
      month,
      year,
      opcoId: opcoId || undefined,
      partnerId: partnerId || undefined,
      page: 1,
    });
  };

  const refresh = () => {
    void loadRequests({ ...result.filters, page: 1 });
  };

  useEffect(() => {
    const handleFocus = () => {
      void loadRequests({ ...result.filters, page: 1 });
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [loadRequests, result.filters]);

  const goToPage = (nextPage: number) => {
    void loadRequests({ ...result.filters, page: nextPage });
  };

  const approve = async (requestId: string) => {
    setActionId(requestId);
    setError(null);
    try {
      const response = await fetch(
        `/api/dizlee/reupload-requests/${requestId}/approve`,
        { method: "PATCH" },
      );
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to approve request");
      }
      await loadRequests({ ...result.filters, page: result.page });
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Failed to approve request",
      );
    } finally {
      setActionId(null);
    }
  };

  const openReject = (item: ReuploadRequestItem) => {
    setRejectTarget(item);
    setDecisionNote("");
    setRejectOpen(true);
  };

  const confirmReject = async () => {
    if (!rejectTarget) {
      return;
    }

    setActionId(rejectTarget.id);
    setError(null);
    try {
      const response = await fetch(
        `/api/dizlee/reupload-requests/${rejectTarget.id}/reject`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ decisionNote }),
        },
      );
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to reject request");
      }
      setRejectOpen(false);
      setRejectTarget(null);
      await loadRequests({ ...result.filters, page: result.page });
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Failed to reject request",
      );
    } finally {
      setActionId(null);
    }
  };

  const yearOptions = [];
  for (let value = year + 1; value >= year - 4; value -= 1) {
    yearOptions.push(value);
  }

  const items = result.items;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Dizlee - Reports</h1>
      </div>

      <ReportsTabs active="reupload" />

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
        <p className="text-sm text-zinc-500">Loading reupload requests…</p>
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
                      Filename
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-zinc-600">
                      Requested by
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-zinc-600">
                      Requested
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-zinc-600">
                      Reason
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-zinc-600">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 bg-white">
                  {items.map((row) => {
                    const busy = actionId === row.id;
                    return (
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
                          {row.requestedBy}
                        </td>
                        <td className="px-4 py-3 text-zinc-600">
                          {formatDateTime(row.requestedAt)}
                        </td>
                        <td className="max-w-xs px-4 py-3 text-zinc-600">
                          {row.reason ?? "—"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void approve(row.id)}
                              className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-40"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => openReject(row)}
                              className="rounded-md border border-zinc-300 px-3 py-1 text-xs text-zinc-700 hover:bg-zinc-100 disabled:opacity-40"
                            >
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
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
            <p className="font-medium text-zinc-900">No pending reupload requests</p>
            <p className="mt-1 text-sm text-zinc-600">
              Pending change requests from OpCos and Partners will appear here.
            </p>
          </div>
        )
      ) : null}

      {rejectOpen && rejectTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-zinc-900">Reject reupload request</h2>
            <p className="mt-2 text-sm text-zinc-600">
              {rejectTarget.opcoName} / {rejectTarget.partnerName} ·{" "}
              {formatPeriod(rejectTarget.period.month, rejectTarget.period.year)}
            </p>
            <label className="mt-4 block text-sm">
              <span className="mb-1 block text-xs text-zinc-500">
                Decision note (optional)
              </span>
              <textarea
                value={decisionNote}
                onChange={(event) => setDecisionNote(event.target.value)}
                rows={3}
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
              />
            </label>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setRejectOpen(false);
                  setRejectTarget(null);
                }}
                className="rounded-md border border-zinc-300 px-4 py-2 text-sm text-zinc-700"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionId === rejectTarget.id}
                onClick={() => void confirmReject()}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-40"
              >
                Reject request
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

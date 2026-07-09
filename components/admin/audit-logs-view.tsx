"use client";

import { useCallback, useState } from "react";

import {
  buildAuditLogQuery,
  type AuditLogFilterOptions,
  type AuditLogListFilters,
  type AuditLogListItem,
  type AuditLogListResult,
} from "@/lib/admin/audit-logs.shared";

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

type AuditLogsViewProps = {
  initialResult: AuditLogListResult;
  filterOptions: AuditLogFilterOptions;
};

export function AuditLogsView({
  initialResult,
  filterOptions,
}: AuditLogsViewProps) {
  const [filters, setFilters] = useState<AuditLogListFilters>(initialResult.filters);
  const [result, setResult] = useState<AuditLogListResult>(initialResult);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadLogs = useCallback(async (nextFilters: AuditLogListFilters) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/admin/audit-logs?${buildAuditLogQuery(nextFilters)}`,
      );
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error ?? "Failed to load audit logs");
      }
      const data = body.data as AuditLogListResult;
      setResult(data);
      setFilters(data.filters);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Failed to load audit logs",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const applyFilters = (patch: Partial<AuditLogListFilters>) => {
    const next = { ...filters, ...patch, page: patch.page ?? 1 };
    setFilters(next);
    void loadLogs(next);
  };

  const exportCsv = () => {
    window.open(`/api/admin/audit-logs/export?${buildAuditLogQuery(filters)}`, "_blank");
  };

  return (
    <div className="space-y-6">
      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="rounded-lg border border-zinc-200 bg-white p-4">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div className="space-y-1">
            <label htmlFor="audit-search" className="text-sm font-medium text-zinc-700">
              Search message
            </label>
            <input
              id="audit-search"
              type="search"
              value={filters.search}
              onChange={(event) =>
                setFilters((current) => ({ ...current, search: event.target.value }))
              }
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="audit-entity-type" className="text-sm font-medium text-zinc-700">
              Category (entity type)
            </label>
            <select
              id="audit-entity-type"
              value={filters.entityType}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  entityType: event.target.value,
                }))
              }
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
            >
              <option value="all">All categories</option>
              {filterOptions.entityTypes.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label htmlFor="audit-actor-role" className="text-sm font-medium text-zinc-700">
              Actor role
            </label>
            <select
              id="audit-actor-role"
              value={filters.actorRole}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  actorRole: event.target.value as AuditLogListFilters["actorRole"],
                }))
              }
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
            >
              <option value="all">All roles</option>
              {filterOptions.actorRoles.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label htmlFor="audit-action" className="text-sm font-medium text-zinc-700">
              Action
            </label>
            <select
              id="audit-action"
              value={filters.action}
              onChange={(event) =>
                setFilters((current) => ({ ...current, action: event.target.value }))
              }
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
            >
              <option value="all">All actions</option>
              {filterOptions.actions.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label htmlFor="audit-entity-id" className="text-sm font-medium text-zinc-700">
              Entity ID
            </label>
            <input
              id="audit-entity-id"
              type="text"
              value={filters.entityId}
              onChange={(event) =>
                setFilters((current) => ({ ...current, entityId: event.target.value }))
              }
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="audit-date-from" className="text-sm font-medium text-zinc-700">
              Date from
            </label>
            <input
              id="audit-date-from"
              type="date"
              value={filters.dateFrom}
              onChange={(event) =>
                setFilters((current) => ({ ...current, dateFrom: event.target.value }))
              }
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="audit-date-to" className="text-sm font-medium text-zinc-700">
              Date to
            </label>
            <input
              id="audit-date-to"
              type="date"
              value={filters.dateTo}
              onChange={(event) =>
                setFilters((current) => ({ ...current, dateTo: event.target.value }))
              }
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => applyFilters({})}
            disabled={loading}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
          >
            {loading ? "Loading…" : "Apply filters"}
          </button>
          <button
            type="button"
            onClick={exportCsv}
            disabled={loading}
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
          >
            Export CSV
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-zinc-200 text-sm">
            <thead className="bg-zinc-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-zinc-600">When</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-600">Actor</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-600">Role</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-600">Action</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-600">Entity</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-600">Message</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {result.items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-zinc-500">
                    No audit log entries match the current filters.
                  </td>
                </tr>
              ) : (
                result.items.map((item: AuditLogListItem) => (
                  <tr key={item.id} className="align-top">
                    <td className="px-4 py-3 whitespace-nowrap text-zinc-700">
                      {formatDateTime(item.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-zinc-700">
                      <div className="font-medium">{item.actorName}</div>
                      <div className="text-xs text-zinc-500">{item.actorEmail}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-zinc-700">
                      {item.actorRole}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-zinc-700">
                      {item.actionLabel}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-zinc-700">
                      <div>{item.entityTypeLabel}</div>
                      <div className="text-xs text-zinc-500">#{item.entityId}</div>
                    </td>
                    <td className="px-4 py-3 text-zinc-700">
                      {item.message ?? "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-zinc-600">
        <p>
          Showing {result.items.length} of {result.total} entries
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={loading || result.page <= 1}
            onClick={() => applyFilters({ page: result.page - 1 })}
            className="rounded-md border border-zinc-300 px-3 py-1.5 hover:bg-zinc-50 disabled:opacity-50"
          >
            Previous
          </button>
          <span>
            Page {result.page} of {result.totalPages}
          </span>
          <button
            type="button"
            disabled={loading || result.page >= result.totalPages}
            onClick={() => applyFilters({ page: result.page + 1 })}
            className="rounded-md border border-zinc-300 px-3 py-1.5 hover:bg-zinc-50 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

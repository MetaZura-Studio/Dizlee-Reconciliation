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
        <p className="rounded-md border border-danger-border bg-danger-muted px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <div className="rounded-lg border border-border bg-surface p-4">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div className="space-y-1">
            <label htmlFor="audit-search" className="text-sm font-medium text-foreground-muted">
              Search message
            </label>
            <input
              id="audit-search"
              type="search"
              value={filters.search}
              onChange={(event) =>
                setFilters((current) => ({ ...current, search: event.target.value }))
              }
              className="w-full rounded-md border border-border-strong px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="audit-entity-type" className="text-sm font-medium text-foreground-muted">
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
              className="w-full rounded-md border border-border-strong px-3 py-2 text-sm outline-none focus:border-primary"
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
            <label htmlFor="audit-actor-role" className="text-sm font-medium text-foreground-muted">
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
              className="w-full rounded-md border border-border-strong px-3 py-2 text-sm outline-none focus:border-primary"
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
            <label htmlFor="audit-action" className="text-sm font-medium text-foreground-muted">
              Action
            </label>
            <select
              id="audit-action"
              value={filters.action}
              onChange={(event) =>
                setFilters((current) => ({ ...current, action: event.target.value }))
              }
              className="w-full rounded-md border border-border-strong px-3 py-2 text-sm outline-none focus:border-primary"
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
            <label htmlFor="audit-entity-id" className="text-sm font-medium text-foreground-muted">
              Entity ID
            </label>
            <input
              id="audit-entity-id"
              type="text"
              value={filters.entityId}
              onChange={(event) =>
                setFilters((current) => ({ ...current, entityId: event.target.value }))
              }
              className="w-full rounded-md border border-border-strong px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="audit-date-from" className="text-sm font-medium text-foreground-muted">
              Date from
            </label>
            <input
              id="audit-date-from"
              type="date"
              value={filters.dateFrom}
              onChange={(event) =>
                setFilters((current) => ({ ...current, dateFrom: event.target.value }))
              }
              className="w-full rounded-md border border-border-strong px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="audit-date-to" className="text-sm font-medium text-foreground-muted">
              Date to
            </label>
            <input
              id="audit-date-to"
              type="date"
              value={filters.dateTo}
              onChange={(event) =>
                setFilters((current) => ({ ...current, dateTo: event.target.value }))
              }
              className="w-full rounded-md border border-border-strong px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => applyFilters({})}
            disabled={loading}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-60"
          >
            {loading ? "Loading…" : "Apply filters"}
          </button>
          <button
            type="button"
            onClick={exportCsv}
            disabled={loading}
            className="rounded-md border border-border-strong px-4 py-2 text-sm font-medium text-foreground-muted hover:bg-surface-muted disabled:opacity-60"
          >
            Export CSV
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-surface-muted">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-foreground-muted">When</th>
                <th className="px-4 py-3 text-left font-medium text-foreground-muted">Actor</th>
                <th className="px-4 py-3 text-left font-medium text-foreground-muted">Role</th>
                <th className="px-4 py-3 text-left font-medium text-foreground-muted">Action</th>
                <th className="px-4 py-3 text-left font-medium text-foreground-muted">Entity</th>
                <th className="px-4 py-3 text-left font-medium text-foreground-muted">Message</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {result.items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-foreground-subtle">
                    No audit log entries match the current filters.
                  </td>
                </tr>
              ) : (
                result.items.map((item: AuditLogListItem) => (
                  <tr key={item.id} className="align-top">
                    <td className="px-4 py-3 whitespace-nowrap text-foreground-muted">
                      {formatDateTime(item.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-foreground-muted">
                      <div className="font-medium">{item.actorName}</div>
                      <div className="text-xs text-foreground-subtle">{item.actorEmail}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-foreground-muted">
                      {item.actorRole}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-foreground-muted">
                      {item.actionLabel}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-foreground-muted">
                      <div>{item.entityTypeLabel}</div>
                      <div className="text-xs text-foreground-subtle">#{item.entityId}</div>
                    </td>
                    <td className="px-4 py-3 text-foreground-muted">
                      {item.message ?? "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-foreground-muted">
        <p>
          Showing {result.items.length} of {result.total} entries
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={loading || result.page <= 1}
            onClick={() => applyFilters({ page: result.page - 1 })}
            className="rounded-md border border-border-strong px-3 py-1.5 hover:bg-surface-muted disabled:opacity-50"
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
            className="rounded-md border border-border-strong px-3 py-1.5 hover:bg-surface-muted disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

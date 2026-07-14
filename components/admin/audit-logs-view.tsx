"use client";

import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DataTable,
  DataTableFrame,
  DataTableHead,
  DataTableRow,
  DataTableTd,
  DataTableTh,
  SortableDataTableTh,
} from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterToolbar, PageCard } from "@/components/ui/page";
import {
  buildAuditLogQuery,
  type AuditLogFilterOptions,
  type AuditLogListFilters,
  type AuditLogListItem,
  type AuditLogListResult,
  type AuditLogSortField,
} from "@/lib/admin/audit-logs.shared";
import { ui } from "@/lib/ui/classes";
import { nextSortState } from "@/lib/ui/sort";

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

  const applySort = (field: AuditLogSortField) => {
    const next = nextSortState(filters.sortBy, filters.sortDir, field);
    applyFilters({ sortBy: next.sortBy, sortDir: next.sortDir });
  };

  const exportCsv = () => {
    window.open(`/api/admin/audit-logs/export?${buildAuditLogQuery(filters)}`, "_blank");
  };

  return (
    <PageCard>
      {error ? <p className={ui.alertError}>{error}</p> : null}

      <FilterToolbar className="mt-6">
        <div className="grid w-full gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div className="space-y-1">
            <label htmlFor="audit-search" className={ui.label}>
              Search message
            </label>
            <input
              id="audit-search"
              type="search"
              value={filters.search}
              onChange={(event) =>
                setFilters((current) => ({ ...current, search: event.target.value }))
              }
              className={ui.input}
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="audit-entity-type" className={ui.label}>
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
              className={ui.select}
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
            <label htmlFor="audit-actor-role" className={ui.label}>
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
              className={ui.select}
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
            <label htmlFor="audit-action" className={ui.label}>
              Action
            </label>
            <select
              id="audit-action"
              value={filters.action}
              onChange={(event) =>
                setFilters((current) => ({ ...current, action: event.target.value }))
              }
              className={ui.select}
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
            <label htmlFor="audit-entity-id" className={ui.label}>
              Entity ID
            </label>
            <input
              id="audit-entity-id"
              type="text"
              value={filters.entityId}
              onChange={(event) =>
                setFilters((current) => ({ ...current, entityId: event.target.value }))
              }
              className={ui.input}
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="audit-date-from" className={ui.label}>
              Date from
            </label>
            <input
              id="audit-date-from"
              type="date"
              value={filters.dateFrom}
              onChange={(event) =>
                setFilters((current) => ({ ...current, dateFrom: event.target.value }))
              }
              className={ui.input}
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="audit-date-to" className={ui.label}>
              Date to
            </label>
            <input
              id="audit-date-to"
              type="date"
              value={filters.dateTo}
              onChange={(event) =>
                setFilters((current) => ({ ...current, dateTo: event.target.value }))
              }
              className={ui.input}
            />
          </div>
        </div>

        <div className="flex w-full flex-wrap gap-3">
          <Button onClick={() => applyFilters({})} disabled={loading}>
            {loading ? "Loading…" : "Apply filters"}
          </Button>
          <Button variant="secondary" onClick={exportCsv} disabled={loading}>
            Export CSV
          </Button>
        </div>
      </FilterToolbar>

      <div className="mt-6 space-y-4">
        {loading ? (
          <p className="text-sm text-foreground-subtle">Loading audit logs…</p>
        ) : result.items.length === 0 ? (
          <EmptyState
            title="No audit entries"
            description="No audit log entries match the current filters."
          />
        ) : (
          <DataTableFrame>
            <DataTable>
              <DataTableHead>
                <tr>
                  <SortableDataTableTh
                    label="When"
                    active={filters.sortBy === "createdAt"}
                    direction={filters.sortDir}
                    onSort={() => applySort("createdAt")}
                  />
                  <SortableDataTableTh
                    label="Actor"
                    active={filters.sortBy === "actor"}
                    direction={filters.sortDir}
                    onSort={() => applySort("actor")}
                  />
                  <DataTableTh>Role</DataTableTh>
                  <SortableDataTableTh
                    label="Action"
                    active={filters.sortBy === "action"}
                    direction={filters.sortDir}
                    onSort={() => applySort("action")}
                  />
                  <SortableDataTableTh
                    label="Entity"
                    active={filters.sortBy === "entityType"}
                    direction={filters.sortDir}
                    onSort={() => applySort("entityType")}
                  />
                  <DataTableTh>Message</DataTableTh>
                </tr>
              </DataTableHead>
              <tbody>
                {result.items.map((item: AuditLogListItem) => (
                  <DataTableRow key={item.id} className="align-top">
                    <DataTableTd className="whitespace-nowrap text-foreground-muted">
                      {formatDateTime(item.createdAt)}
                    </DataTableTd>
                    <DataTableTd className="text-foreground-muted">
                      <div className="font-medium">{item.actorName}</div>
                      <div className="text-xs text-foreground-subtle">{item.actorEmail}</div>
                    </DataTableTd>
                    <DataTableTd className="whitespace-nowrap text-foreground-muted">
                      {item.actorRole}
                    </DataTableTd>
                    <DataTableTd className="whitespace-nowrap text-foreground-muted">
                      {item.actionLabel}
                    </DataTableTd>
                    <DataTableTd className="whitespace-nowrap text-foreground-muted">
                      <div>{item.entityTypeLabel}</div>
                      <div className="text-xs text-foreground-subtle">#{item.entityId}</div>
                    </DataTableTd>
                    <DataTableTd className="text-foreground-muted">
                      {item.message ?? "—"}
                    </DataTableTd>
                  </DataTableRow>
                ))}
              </tbody>
            </DataTable>
          </DataTableFrame>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-foreground-muted">
          <p>
            Showing {result.items.length} of {result.total} entries
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              disabled={loading || result.page <= 1}
              onClick={() => applyFilters({ page: result.page - 1 })}
            >
              Previous
            </Button>
            <span>
              Page {result.page} of {result.totalPages}
            </span>
            <Button
              variant="secondary"
              disabled={loading || result.page >= result.totalPages}
              onClick={() => applyFilters({ page: result.page + 1 })}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </PageCard>
  );
}

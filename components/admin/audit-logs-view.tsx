"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  DateRangePicker,
  formatDateRangeLabel,
} from "@/components/admin/date-range-picker";
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
import { PageCard } from "@/components/ui/page";
import {
  buildAuditLogQuery,
  type AuditLogFilterOptions,
  type AuditLogListFilters,
  type AuditLogListItem,
  type AuditLogListResult,
  type AuditLogSortField,
} from "@/lib/admin/audit-logs.shared";
import { cn, ui } from "@/lib/ui/classes";
import { nextSortState } from "@/lib/ui/sort";

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className={className}>
      <circle cx="9" cy="9" r="5.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M13.5 13.5 17 17"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function FilterIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className={className}>
      <path
        d="M3 5.5h14M5.5 10h9M8 14.5h4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

type FilterSelectProps = {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
  disabled?: boolean;
};

function FilterSelect({
  label,
  value,
  options,
  onChange,
  disabled,
}: FilterSelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.value === value);
  const isActive = value !== "all";

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleClickOutside(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "inline-flex h-10 items-center gap-2 rounded-2xl border px-3 text-sm font-medium transition-colors",
          isActive
            ? "border-primary bg-primary-muted text-primary"
            : "border-border bg-surface text-foreground-muted hover:bg-surface-muted",
        )}
        aria-expanded={open}
      >
        <FilterIcon className="h-4 w-4 shrink-0" />
        <span className="max-w-[10rem] truncate">
          {isActive ? selected?.label ?? label : label}
        </span>
        <span aria-hidden="true" className="text-xs opacity-70">
          ▾
        </span>
      </button>

      {open ? (
        <div
          role="listbox"
          className="absolute left-0 z-30 mt-2 max-h-72 w-56 overflow-auto rounded-2xl border border-border bg-surface py-1 shadow-[var(--shadow-md)]"
        >
          {options.map((option) => {
            const active = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={active}
                className={cn(
                  "flex w-full px-3 py-2 text-left text-sm transition-colors",
                  active
                    ? "bg-primary-muted font-semibold text-primary"
                    : "text-foreground-muted hover:bg-surface-muted",
                )}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
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
  const [searchDraft, setSearchDraft] = useState(initialResult.filters.search);
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
      setSearchDraft(data.filters.search);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Failed to load audit logs",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const applyFilters = (patch: Partial<AuditLogListFilters>) => {
    const next = {
      ...filters,
      ...patch,
      search: patch.search ?? searchDraft,
      entityId: "",
      page: patch.page ?? 1,
    };
    setFilters(next);
    void loadLogs(next);
  };

  const applySort = (field: AuditLogSortField) => {
    const next = nextSortState(filters.sortBy, filters.sortDir, field);
    applyFilters({ sortBy: next.sortBy, sortDir: next.sortDir });
  };

  const exportCsv = () => {
    const exportFilters = { ...filters, search: searchDraft, entityId: "" };
    window.open(
      `/api/admin/audit-logs/export?${buildAuditLogQuery(exportFilters)}`,
      "_blank",
    );
  };

  const submitSearch = () => {
    applyFilters({ search: searchDraft });
  };

  return (
    <PageCard>
      {error ? <p className={ui.alertError}>{error}</p> : null}

      <div className="space-y-4">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-foreground-subtle" />
          <input
            id="audit-search"
            type="search"
            value={searchDraft}
            placeholder="Search audit messages…"
            onChange={(event) => setSearchDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                submitSearch();
              }
            }}
            className={cn(ui.input, "pl-10")}
            aria-label="Search audit messages"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <FilterSelect
            label="Category"
            value={filters.entityType}
            disabled={loading}
            onChange={(entityType) => applyFilters({ entityType })}
            options={[
              { value: "all", label: "All categories" },
              ...filterOptions.entityTypes.map((item) => ({
                value: item.code,
                label: item.label,
              })),
            ]}
          />

          <FilterSelect
            label="Actor role"
            value={filters.actorRole}
            disabled={loading}
            onChange={(actorRole) =>
              applyFilters({
                actorRole: actorRole as AuditLogListFilters["actorRole"],
              })
            }
            options={[
              { value: "all", label: "All roles" },
              ...filterOptions.actorRoles.map((item) => ({
                value: item.code,
                label: item.label,
              })),
            ]}
          />

          <FilterSelect
            label="Action"
            value={filters.action}
            disabled={loading}
            onChange={(action) => applyFilters({ action })}
            options={[
              { value: "all", label: "All actions" },
              ...filterOptions.actions.map((item) => ({
                value: item.code,
                label: item.label,
              })),
            ]}
          />

          <DateRangePicker
            disabled={loading}
            value={{ dateFrom: filters.dateFrom, dateTo: filters.dateTo }}
            onApply={(range) =>
              applyFilters({
                dateFrom: range.dateFrom,
                dateTo: range.dateTo,
              })
            }
          />

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Button variant="secondary" onClick={exportCsv} disabled={loading}>
              Export CSV
            </Button>
            <Button onClick={submitSearch} disabled={loading}>
              {loading ? "Loading…" : "Apply"}
            </Button>
          </div>
        </div>

        {(filters.dateFrom || filters.dateTo) && (
          <p className="text-xs text-foreground-subtle">
            Date range: {formatDateRangeLabel({
              dateFrom: filters.dateFrom,
              dateTo: filters.dateTo,
            })}
          </p>
        )}
      </div>

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
                      <div className="text-xs text-foreground-subtle">
                        {item.actorEmail}
                      </div>
                    </DataTableTd>
                    <DataTableTd className="whitespace-nowrap text-foreground-muted">
                      {item.actorRole}
                    </DataTableTd>
                    <DataTableTd className="whitespace-nowrap text-foreground-muted">
                      {item.actionLabel}
                    </DataTableTd>
                    <DataTableTd className="whitespace-nowrap text-foreground-muted">
                      {item.entityTypeLabel}
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

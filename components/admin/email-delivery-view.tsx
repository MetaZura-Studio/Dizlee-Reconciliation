/**
 * Browse and filter outbound email delivery attempts (SMTP handoff log).
 */

"use client";

import { useCallback, useState } from "react";

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
import { FilterActions } from "@/components/ui/filter-actions";
import { LoadingOverlay } from "@/components/ui/loading";
import { PageCard } from "@/components/ui/page";
import {
  buildEmailDeliveryQuery,
  emailDeliveryPurposeLabel,
  emailDeliveryStatusLabel,
  parseEmailDeliveryListFilters,
  type EmailDeliveryFilterOptions,
  type EmailDeliveryListFilters,
  type EmailDeliveryListResult,
  type EmailDeliverySortField,
} from "@/lib/admin/email-delivery.shared";
import { formatAppError } from "@/lib/errors/format";
import { formatAppDateTime } from "@/lib/platform/format-datetime";
import { cn, ui } from "@/lib/ui/classes";
import { nextSortState } from "@/lib/ui/sort";

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
  return (
    <label className="inline-flex items-center gap-2 text-sm text-foreground-muted">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className={cn(ui.select, "min-w-[9rem]")}
        aria-label={label}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function statusClass(status: string): string {
  switch (status) {
    case "ACCEPTED":
      return "text-emerald-700";
    case "FAILED":
      return "text-red-700";
    case "SKIPPED":
      return "text-amber-700";
    default:
      return "text-foreground-muted";
  }
}

type EmailDeliveryViewProps = {
  initialResult: EmailDeliveryListResult;
  filterOptions: EmailDeliveryFilterOptions;
};

export function EmailDeliveryView({
  initialResult,
  filterOptions,
}: EmailDeliveryViewProps) {
  const [result, setResult] = useState(initialResult);
  const [filters, setFilters] = useState<EmailDeliveryListFilters>(
    initialResult.filters,
  );
  const [searchDraft, setSearchDraft] = useState(initialResult.filters.search);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (nextFilters: EmailDeliveryListFilters) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/admin/email-delivery?${buildEmailDeliveryQuery(nextFilters)}`,
      );
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(formatAppError(payload, "Failed to load email delivery log"));
      }
      setResult(payload.data as EmailDeliveryListResult);
      setFilters((payload.data as EmailDeliveryListResult).filters);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load email delivery log",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const applyFilters = (patch: Partial<EmailDeliveryListFilters>) => {
    const next = {
      ...filters,
      ...patch,
      page: patch.page ?? 1,
    };
    setFilters(next);
    void load(next);
  };

  const submitSearch = () => {
    applyFilters({ search: searchDraft, page: 1 });
  };

  const clearFilters = () => {
    setSearchDraft("");
    const cleared = parseEmailDeliveryListFilters(new URLSearchParams());
    setFilters(cleared);
    void load(cleared);
  };

  const toggleSort = (field: EmailDeliverySortField) => {
    const next = nextSortState(filters.sortBy, filters.sortDir, field);
    applyFilters({ sortBy: next.sortBy, sortDir: next.sortDir });
  };

  return (
    <PageCard>
      <div className="space-y-4">
        <div className="relative max-w-md">
          <input
            type="search"
            value={searchDraft}
            placeholder="Search to, subject, error, message id…"
            onChange={(event) => setSearchDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                submitSearch();
              }
            }}
            className={cn(ui.input, "w-full")}
            aria-label="Search email deliveries"
          />
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <FilterSelect
              label="Status"
              value={filters.status}
              disabled={loading}
              onChange={(status) =>
                applyFilters({
                  status: status as EmailDeliveryListFilters["status"],
                })
              }
              options={[
                { value: "all", label: "All statuses" },
                ...filterOptions.statuses.map((item) => ({
                  value: item.code,
                  label: item.label,
                })),
              ]}
            />

            <FilterSelect
              label="Purpose"
              value={filters.purpose}
              disabled={loading}
              onChange={(purpose) => applyFilters({ purpose })}
              options={[
                { value: "all", label: "All purposes" },
                ...filterOptions.purposes.map((item) => ({
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
          </div>

          <FilterActions
            onApply={submitSearch}
            onClear={clearFilters}
            loading={loading}
            applyLabel={loading ? "Loading…" : "Apply"}
          />
        </div>

        {(filters.dateFrom || filters.dateTo) && (
          <p className="text-xs text-foreground-subtle">
            Date range:{" "}
            {formatDateRangeLabel({
              dateFrom: filters.dateFrom,
              dateTo: filters.dateTo,
            })}
          </p>
        )}

        {error ? <p className={ui.alertError}>{error}</p> : null}
      </div>

      <div className="mt-6 space-y-4">
        <LoadingOverlay active={loading} className="min-h-[12rem]">
          {result.items.length === 0 ? (
            <EmptyState
              title="No email attempts"
              description="No outbound email attempts match the current filters."
            />
          ) : (
            <DataTableFrame>
              <DataTable>
                <DataTableHead>
                  <tr>
                    <SortableDataTableTh
                      label="Time"
                      active={filters.sortBy === "createdAt"}
                      direction={filters.sortDir}
                      onSort={() => toggleSort("createdAt")}
                    />
                    <SortableDataTableTh
                      label="To"
                      active={filters.sortBy === "toEmail"}
                      direction={filters.sortDir}
                      onSort={() => toggleSort("toEmail")}
                    />
                    <SortableDataTableTh
                      label="Purpose"
                      active={filters.sortBy === "purpose"}
                      direction={filters.sortDir}
                      onSort={() => toggleSort("purpose")}
                    />
                    <SortableDataTableTh
                      label="Status"
                      active={filters.sortBy === "status"}
                      direction={filters.sortDir}
                      onSort={() => toggleSort("status")}
                    />
                    <DataTableTh>Detail</DataTableTh>
                    <DataTableTh>Notification</DataTableTh>
                  </tr>
                </DataTableHead>
                <tbody>
                  {result.items.map((row) => (
                    <DataTableRow key={row.id}>
                      <DataTableTd className="whitespace-nowrap text-sm">
                        {formatAppDateTime(row.createdAt)}
                      </DataTableTd>
                      <DataTableTd className="max-w-[14rem]">
                        <div className="truncate text-sm font-medium">
                          {row.toEmail}
                        </div>
                        {row.originalToEmail ? (
                          <div className="truncate text-xs text-foreground-subtle">
                            Original: {row.originalToEmail}
                          </div>
                        ) : null}
                      </DataTableTd>
                      <DataTableTd className="text-sm">
                        {emailDeliveryPurposeLabel(row.purpose)}
                      </DataTableTd>
                      <DataTableTd>
                        <span
                          className={cn(
                            "text-sm font-medium",
                            statusClass(row.status),
                          )}
                        >
                          {emailDeliveryStatusLabel(row.status)}
                        </span>
                        {row.skipReason ? (
                          <div className="text-xs text-foreground-subtle">
                            {row.skipReason}
                          </div>
                        ) : null}
                      </DataTableTd>
                      <DataTableTd className="max-w-[18rem] text-sm">
                        {row.errorCode || row.errorMessage ? (
                          <div>
                            {row.errorCode ? (
                              <span className="font-mono text-xs">
                                {row.errorCode}
                              </span>
                            ) : null}
                            {row.errorMessage ? (
                              <div className="line-clamp-2 text-xs text-foreground-muted">
                                {row.errorMessage}
                              </div>
                            ) : null}
                          </div>
                        ) : row.providerMessageId ? (
                          <span className="font-mono text-xs text-foreground-muted">
                            {row.providerMessageId}
                          </span>
                        ) : (
                          <span className="text-xs text-foreground-subtle">
                            {row.subject}
                          </span>
                        )}
                      </DataTableTd>
                      <DataTableTd className="text-sm text-foreground-muted">
                        {row.notificationId ?? "—"}
                      </DataTableTd>
                    </DataTableRow>
                  ))}
                </tbody>
              </DataTable>
            </DataTableFrame>
          )}
        </LoadingOverlay>

        {result.totalPages > 1 ? (
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-foreground-muted">
              Page {result.page} of {result.totalPages} ({result.total} total)
            </p>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                disabled={loading || result.page <= 1}
                onClick={() => applyFilters({ page: result.page - 1 })}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                disabled={loading || result.page >= result.totalPages}
                onClick={() => applyFilters({ page: result.page + 1 })}
              >
                Next
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </PageCard>
  );
}

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
import { Modal } from "@/components/ui/modal";
import { FilterToolbar, PageCard } from "@/components/ui/page";
import {
  buildEmailDeliveryQuery,
  emailDeliveryDetailText,
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

/** Truncated detail with optional modal for the full message. */
function EmailDeliveryDetailCell({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const showMore = text.trim().length > 120;

  return (
    <div className="max-w-[20rem]">
      <div className="line-clamp-3 text-sm text-foreground-muted">{text}</div>
      {showMore ? (
        <>
          <button
            type="button"
            className="mt-1 text-xs font-medium text-primary underline-offset-2 hover:underline"
            onClick={() => setOpen(true)}
          >
            See more
          </button>
          <Modal open={open} title="Detail" onClose={() => setOpen(false)}>
            <p className="whitespace-pre-wrap break-words text-sm text-foreground">
              {text}
            </p>
          </Modal>
        </>
      ) : null}
    </div>
  );
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
      {error ? <p className={cn(ui.alertError, "mb-4")}>{error}</p> : null}

      <FilterToolbar>
        <div className="grid min-w-0 w-full flex-1 gap-4 sm:grid-cols-2 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,0.75fr)_minmax(0,1fr)_auto]">
          <label className="block min-w-0 text-sm sm:col-span-2 xl:col-span-1">
            <span className={ui.label}>Search</span>
            <input
              type="search"
              value={searchDraft}
              placeholder="Search to, subject, error…"
              onChange={(event) => setSearchDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  submitSearch();
                }
              }}
              className={cn(ui.input, "w-full")}
              aria-label="Search email deliveries"
              disabled={loading}
            />
          </label>

          <label className="block min-w-0 text-sm">
            <span className={ui.label}>Status</span>
            <select
              value={filters.status}
              disabled={loading}
              onChange={(event) =>
                applyFilters({
                  status: event.target.value as EmailDeliveryListFilters["status"],
                })
              }
              className={ui.select}
              aria-label="Status"
            >
              <option value="all">All statuses</option>
              {filterOptions.statuses.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <div className="min-w-0 text-sm">
            <span className={ui.label}>Date range</span>
            <div className="[&_button]:h-11 [&_button]:w-full [&_button]:justify-start">
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
            {(filters.dateFrom || filters.dateTo) && (
              <p className="mt-1 text-xs text-foreground-subtle">
                {formatDateRangeLabel({
                  dateFrom: filters.dateFrom,
                  dateTo: filters.dateTo,
                })}
              </p>
            )}
          </div>

          <div className="flex flex-col justify-end text-sm sm:col-span-2 xl:col-span-1 xl:justify-self-end">
            <span className={ui.label} aria-hidden="true">
              &nbsp;
            </span>
            <FilterActions
              onApply={submitSearch}
              onClear={clearFilters}
              loading={loading}
              applyLabel={loading ? "Loading…" : "Apply"}
              className="sm:ml-0"
            />
          </div>
        </div>
      </FilterToolbar>

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
                      label="Status"
                      active={filters.sortBy === "status"}
                      direction={filters.sortDir}
                      onSort={() => toggleSort("status")}
                    />
                    <DataTableTh>Detail</DataTableTh>
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
                      <DataTableTd>
                        <span
                          className={cn(
                            "text-sm font-medium",
                            statusClass(row.status),
                          )}
                        >
                          {emailDeliveryStatusLabel(row.status)}
                        </span>
                      </DataTableTd>
                      <DataTableTd>
                        <EmailDeliveryDetailCell
                          text={emailDeliveryDetailText(row)}
                        />
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

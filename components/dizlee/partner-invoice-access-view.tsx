/**
 * Dizlee: per-Partner toggle for Partner → Dizlee invoice upload.
 */

"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";

import { InvoicesTabs } from "@/components/dizlee/invoices-tabs";
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
import { FieldLabel, Select } from "@/components/ui/field";
import { ListSearch } from "@/components/ui/list-search";
import { LoadingOverlay } from "@/components/ui/loading";
import { Modal } from "@/components/ui/modal";
import { FilterToolbar, PageCard, PageHeader } from "@/components/ui/page";
import { StatusPill } from "@/components/ui/status-pill";
import { useToast } from "@/components/ui/toast";
import type {
  BulkPartnerInvoiceAccessResult,
  PartnerInvoiceAccessFilters,
  PartnerInvoiceAccessItem,
  PartnerInvoiceAccessResult,
  PartnerInvoiceAccessSortField,
  PartnerInvoiceAccessStatusFilter,
} from "@/lib/dizlee/partner-invoice-access.shared";
import { formatAppError } from "@/lib/errors/format";
import { cn } from "@/lib/ui/classes";
import { nextSortState, type SortDirection } from "@/lib/ui/sort";
import { useDebouncedValue } from "@/lib/ui/use-debounced-value";

type PartnerInvoiceAccessViewProps = {
  initialResult: PartnerInvoiceAccessResult;
};

function InvoiceAccessSwitch(props: {
  enabled: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={props.enabled}
      aria-label={props.label}
      disabled={props.disabled}
      onClick={() => props.onChange(!props.enabled)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-50",
        props.enabled ? "bg-primary" : "bg-border",
      )}
    >
      <span
        className={cn(
          "pointer-events-none inline-block h-5 w-5 translate-y-px rounded-full bg-white shadow transition-transform",
          props.enabled ? "translate-x-[22px]" : "translate-x-0.5",
        )}
      />
    </button>
  );
}

function buildQuery(filters: PartnerInvoiceAccessFilters): string {
  const params = new URLSearchParams();
  if (filters.search?.trim()) {
    params.set("search", filters.search.trim());
  }
  if (filters.status !== "all") {
    params.set("status", filters.status);
  }
  if (filters.sortBy !== "name" || filters.sortDir !== "asc") {
    params.set("sortBy", filters.sortBy);
    params.set("sortDir", filters.sortDir);
  }
  if (filters.page > 1) {
    params.set("page", String(filters.page));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export function PartnerInvoiceAccessView({
  initialResult,
}: PartnerInvoiceAccessViewProps) {
  const toast = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const [result, setResult] = useState(initialResult);
  const [search, setSearch] = useState(initialResult.filters.search ?? "");
  const [status, setStatus] = useState<PartnerInvoiceAccessStatusFilter>(
    initialResult.filters.status,
  );
  const [sortBy, setSortBy] = useState(initialResult.filters.sortBy);
  const [sortDir, setSortDir] = useState<SortDirection>(
    initialResult.filters.sortDir,
  );
  const debouncedSearch = useDebouncedValue(search, 300);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [listPending, startListTransition] = useTransition();
  const [togglePending, startToggleTransition] = useTransition();
  const [bulkPending, startBulkTransition] = useTransition();
  const [bulkConfirm, setBulkConfirm] = useState<"open" | "close" | null>(
    null,
  );

  useEffect(() => {
    setResult(initialResult);
    setSearch(initialResult.filters.search ?? "");
    setStatus(initialResult.filters.status);
    setSortBy(initialResult.filters.sortBy);
    setSortDir(initialResult.filters.sortDir);
  }, [initialResult]);

  const currentFilters = useCallback((): PartnerInvoiceAccessFilters => {
    return {
      search: search.trim() || undefined,
      status,
      sortBy,
      sortDir,
      page: result.page,
    };
  }, [result.page, search, sortBy, sortDir, status]);

  const loadPage = useCallback(
    (filters: PartnerInvoiceAccessFilters) => {
      startListTransition(async () => {
        try {
          const qs = buildQuery(filters);
          router.replace(`${pathname}${qs}`, { scroll: false });
          const response = await fetch(
            `/api/dizlee/partners/invoice-access${qs}`,
          );
          const payload = (await response.json().catch(() => ({}))) as {
            data?: PartnerInvoiceAccessResult;
            error?: unknown;
          };
          if (!response.ok || !payload.data) {
            toast.error(
              formatAppError(payload, "Could not load partners"),
            );
            return;
          }
          setResult(payload.data);
          setStatus(payload.data.filters.status);
          setSortBy(payload.data.filters.sortBy);
          setSortDir(payload.data.filters.sortDir);
        } catch {
          toast.error("Could not load partners");
        }
      });
    },
    [pathname, router, toast],
  );

  useEffect(() => {
    const next = debouncedSearch.trim();
    const current = (result.filters.search ?? "").trim();
    if (next === current) {
      return;
    }
    loadPage({
      search: next || undefined,
      status,
      sortBy,
      sortDir,
      page: 1,
    });
    // Only react to debounced search changes, not result/filter churn.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional
  }, [debouncedSearch]);

  const applyStatus = (next: PartnerInvoiceAccessStatusFilter) => {
    setStatus(next);
    loadPage({
      search: search.trim() || undefined,
      status: next,
      sortBy,
      sortDir,
      page: 1,
    });
  };

  const applySort = (field: PartnerInvoiceAccessSortField) => {
    const next = nextSortState(sortBy, sortDir, field);
    setSortBy(next.sortBy);
    setSortDir(next.sortDir);
    loadPage({
      search: search.trim() || undefined,
      status,
      sortBy: next.sortBy,
      sortDir: next.sortDir,
      page: 1,
    });
  };

  const setEnabled = useCallback(
    (partnerId: string, enabled: boolean) => {
      const previous = result;
      setResult((current) => ({
        ...current,
        items: current.items.map((row) =>
          row.id === partnerId
            ? { ...row, invoiceUploadEnabled: enabled }
            : row,
        ),
      }));
      setPendingId(partnerId);

      startToggleTransition(async () => {
        try {
          const response = await fetch(
            `/api/dizlee/partners/${encodeURIComponent(partnerId)}/invoice-access`,
            {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ enabled }),
            },
          );
          const payload = (await response.json().catch(() => ({}))) as {
            data?: PartnerInvoiceAccessItem;
            error?: unknown;
          };

          if (!response.ok || !payload.data) {
            setResult(previous);
            toast.error(
              formatAppError(
                payload,
                "Could not update invoice upload access",
              ),
            );
            return;
          }

          setResult((current) => ({
            ...current,
            items: current.items.map((row) =>
              row.id === partnerId ? payload.data! : row,
            ),
          }));
          toast.success(
            enabled
              ? "Invoice upload enabled — Partner notified."
              : "Invoice upload disabled for this Partner.",
          );
        } catch {
          setResult(previous);
          toast.error("Could not update invoice upload access");
        } finally {
          setPendingId(null);
        }
      });
    },
    [result, toast],
  );

  const bulkScopeLabel =
    status === "all" && !search.trim()
      ? "all Partners"
      : "Partners matching the current filters";

  const confirmBulkSetEnabled = () => {
    if (!bulkConfirm) {
      return;
    }
    const enabled = bulkConfirm === "open";

    startBulkTransition(async () => {
      try {
        const response = await fetch("/api/dizlee/partners/invoice-access", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            enabled,
            search: search.trim() || undefined,
            status,
          }),
        });
        const payload = (await response.json().catch(() => ({}))) as {
          data?: BulkPartnerInvoiceAccessResult;
          error?: unknown;
        };
        if (!response.ok || !payload.data) {
          toast.error(
            formatAppError(
              payload,
              "Could not update invoice upload access",
            ),
          );
          return;
        }

        const { updatedCount, notifiedCount } = payload.data;
        if (updatedCount === 0) {
          toast.success(
            enabled
              ? "All matching Partners are already Open."
              : "All matching Partners are already Closed.",
          );
        } else if (enabled) {
          toast.success(
            `Opened ${updatedCount} Partner${updatedCount === 1 ? "" : "s"}${
              notifiedCount > 0 ? " — notified." : "."
            }`,
          );
        } else {
          toast.success(
            `Closed ${updatedCount} Partner${updatedCount === 1 ? "" : "s"}.`,
          );
        }

        setBulkConfirm(null);
        loadPage({
          search: search.trim() || undefined,
          status,
          sortBy,
          sortDir,
          page: 1,
        });
      } catch {
        toast.error("Could not update invoice upload access");
      }
    });
  };

  const showingFrom =
    result.totalCount === 0
      ? 0
      : (result.page - 1) * result.pageSize + 1;
  const showingTo = Math.min(
    result.page * result.pageSize,
    result.totalCount,
  );
  // Full-table overlay only for list reload / bulk — single toggles use the switch busy state.
  const tableBusy = listPending || bulkPending;
  const busy = tableBusy || togglePending;

  return (
    <PageCard>
      <PageHeader
        title="Invoices"
        description="Control which Partners may upload Partner → Dizlee invoices. Enabling a closed Partner sends them a notification."
      />

      <Modal
        open={bulkConfirm !== null}
        title={
          bulkConfirm === "open"
            ? "Open invoice upload"
            : "Close invoice upload"
        }
        onClose={() => {
          if (!bulkPending) {
            setBulkConfirm(null);
          }
        }}
      >
        <p className="text-sm text-foreground-muted">
          {bulkConfirm === "open" ? (
            <>
              This will open invoice upload for{" "}
              <span className="font-medium text-foreground">
                {bulkScopeLabel}
              </span>
              . Partners that were Closed will be notified.
            </>
          ) : (
            <>
              This will close invoice upload for{" "}
              <span className="font-medium text-foreground">
                {bulkScopeLabel}
              </span>
              .
            </>
          )}
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button
            type="button"
            variant="secondary"
            disabled={bulkPending}
            onClick={() => setBulkConfirm(null)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant={bulkConfirm === "close" ? "danger" : "primary"}
            disabled={bulkPending}
            onClick={confirmBulkSetEnabled}
          >
            {bulkPending
              ? "Updating…"
              : bulkConfirm === "open"
                ? "Open all"
                : "Close all"}
          </Button>
        </div>
      </Modal>

      <InvoicesTabs active="partner-access" />

      <FilterToolbar className="mt-4 flex-col items-stretch gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <ListSearch
            value={search}
            onChange={setSearch}
            placeholder="Search partner by name…"
            aria-label="Search partners"
          />
        </div>
        <div className="w-full sm:w-48">
          <FieldLabel htmlFor="partner-access-status">Status</FieldLabel>
          <Select
            id="partner-access-status"
            value={status}
            disabled={busy}
            onChange={(event) =>
              applyStatus(
                event.target.value as PartnerInvoiceAccessStatusFilter,
              )
            }
          >
            <option value="all">All</option>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
          </Select>
        </div>
      </FilterToolbar>

      <div className="mt-4 flex justify-end gap-2">
        <Button
          type="button"
          variant="secondary"
          disabled={busy}
          onClick={() => setBulkConfirm("open")}
        >
          Open all
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={busy}
          onClick={() => setBulkConfirm("close")}
        >
          Close all
        </Button>
      </div>

      <LoadingOverlay
        active={tableBusy}
        className="mt-3 min-h-[12rem]"
        label={bulkPending ? "Updating…" : "Loading…"}
      >
        {result.items.length === 0 ? (
          <EmptyState
            title={
              result.filters.search || result.filters.status !== "all"
                ? "No partners match your filters"
                : "No partners"
            }
            description={
              result.filters.search || result.filters.status !== "all"
                ? "Try a different search or status."
                : "Partners will appear here once they are created in Admin."
            }
          />
        ) : (
          <>
            <DataTableFrame>
              <DataTable>
                <DataTableHead>
                  <tr>
                    <SortableDataTableTh
                      label="Partner"
                      active={sortBy === "name"}
                      direction={sortDir}
                      onSort={() => applySort("name")}
                    />
                    <DataTableTh>Status</DataTableTh>
                    <SortableDataTableTh
                      label="Last updated"
                      active={sortBy === "updatedAt"}
                      direction={sortDir}
                      onSort={() => applySort("updatedAt")}
                    />
                    <DataTableTh>Action</DataTableTh>
                  </tr>
                </DataTableHead>
                <tbody>
                  {result.items.map((row) => {
                    const rowBusy = pendingId === row.id;
                    return (
                      <DataTableRow key={row.id}>
                        <DataTableTd className="font-medium text-foreground">
                          {row.name}
                        </DataTableTd>
                        <DataTableTd>
                          <StatusPill
                            tone={
                              row.invoiceUploadEnabled ? "success" : "warning"
                            }
                          >
                            {row.invoiceUploadEnabled ? "Open" : "Closed"}
                          </StatusPill>
                        </DataTableTd>
                        <DataTableTd className="text-foreground-muted">
                          {row.updatedAtLabel}
                        </DataTableTd>
                        <DataTableTd>
                          <InvoiceAccessSwitch
                            enabled={row.invoiceUploadEnabled}
                            disabled={rowBusy || busy}
                            label={`${row.invoiceUploadEnabled ? "Disable" : "Enable"} invoice upload for ${row.name}`}
                            onChange={(next) => setEnabled(row.id, next)}
                          />
                        </DataTableTd>
                      </DataTableRow>
                    );
                  })}
                </tbody>
              </DataTable>
            </DataTableFrame>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-foreground-muted">
              <p>
                Showing {showingFrom}–{showingTo} of {result.totalCount}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  disabled={result.page <= 1 || busy}
                  onClick={() =>
                    loadPage({ ...currentFilters(), page: result.page - 1 })
                  }
                >
                  Previous
                </Button>
                <span>
                  Page {result.page} of {result.totalPages}
                </span>
                <Button
                  variant="secondary"
                  disabled={result.page >= result.totalPages || busy}
                  onClick={() =>
                    loadPage({ ...currentFilters(), page: result.page + 1 })
                  }
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </LoadingOverlay>
    </PageCard>
  );
}

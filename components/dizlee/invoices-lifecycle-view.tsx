/**
 * Pipeline view of invoices grouped by lifecycle stage (draft through paid).
 * Supports monitoring invoice progression across OpCos and partners.
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { InvoicesTabs } from "@/components/dizlee/invoices-tabs";
import { Button } from "@/components/ui/button";
import {
  DataTable,
  DataTableFrame,
  DataTableHead,
  DataTableTd,
  DataTableTh,
} from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterToolbar, PageCard, PageHeader } from "@/components/ui/page";
import { StatusPill } from "@/components/ui/status-pill";
import { LoadingOverlay } from "@/components/ui/loading";
import { cn, ui } from "@/lib/ui/classes";
import { invoiceStatusTone } from "@/lib/ui/status-tones";
import type { InvoiceFilterOptions } from "@/lib/dizlee/invoices";
import {
  getCurrentPeriod,
  getMaxMonthForYear,
  getPeriodYearOptions,
} from "@/lib/platform/period";
import type {
  InvoiceLifecycleDetail,
  LifecycleListFilters,
  LifecycleListItem,
  LifecycleListResult,
} from "@/lib/dizlee/invoice-lifecycle";
import { formatAppDateTime } from "@/lib/platform/format-datetime";
import { formatAppError } from "@/lib/errors/format";

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

function buildListQuery(filters: LifecycleListFilters): string {
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

type InvoicesLifecycleViewProps = {
  initialResult: LifecycleListResult;
  initialFilterOptions: InvoiceFilterOptions;
  initialDetail: InvoiceLifecycleDetail | null;
};

export function InvoicesLifecycleView({
  initialResult,
  initialFilterOptions,
  initialDetail,
}: InvoicesLifecycleViewProps) {
  const [month, setMonth] = useState(initialResult.filters.month);
  const [year, setYear] = useState(initialResult.filters.year);
  const [opcoId, setOpcoId] = useState(initialResult.filters.opcoId ?? "");
  const [partnerId, setPartnerId] = useState(initialResult.filters.partnerId ?? "");

  const [result, setResult] = useState<LifecycleListResult>(initialResult);
  const [filterOptions, setFilterOptions] =
    useState<InvoiceFilterOptions>(initialFilterOptions);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(
    initialResult.items[0]?.id ?? null,
  );
  const [detail, setDetail] = useState<InvoiceLifecycleDetail | null>(initialDetail);
  const [detailLoading, setDetailLoading] = useState(false);
  const skipAutoReload = useRef(true);
  const selectedIdRef = useRef<string | null>(initialResult.items[0]?.id ?? null);

  const fetchDetail = useCallback(async (invoiceId: string) => {
    setDetailLoading(true);
    try {
      const response = await fetch(
        `/api/dizlee/invoices/lifecycle?invoiceId=${invoiceId}`,
      );
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(formatAppError(payload, "Failed to load lifecycle detail"));
      }
      setDetail(payload.data as InvoiceLifecycleDetail);
    } catch (detailError) {
      setError(
        detailError instanceof Error
          ? detailError.message
          : "Failed to load lifecycle detail",
      );
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const handleSelect = (invoiceId: string) => {
    selectedIdRef.current = invoiceId;
    setSelectedId(invoiceId);
    void fetchDetail(invoiceId);
  };

  const loadList = useCallback(
    async (filters: LifecycleListFilters, preferredId?: string | null) => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/dizlee/invoices/lifecycle?${buildListQuery(filters)}`,
        );
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(formatAppError(payload, "Failed to load lifecycle invoices"));
        }
        const nextResult = payload.data as LifecycleListResult;
        setResult(nextResult);
        setFilterOptions(payload.filterOptions as InvoiceFilterOptions);

        const nextId = nextResult.items.some((item) => item.id === preferredId)
          ? preferredId!
          : (nextResult.items[0]?.id ?? null);
        selectedIdRef.current = nextId;
        setSelectedId(nextId);
        if (nextId) {
          await fetchDetail(nextId);
        } else {
          setDetail(null);
        }
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Failed to load lifecycle invoices",
        );
      } finally {
        setLoading(false);
      }
    },
    [fetchDetail],
  );

  useEffect(() => {
    if (skipAutoReload.current) {
      skipAutoReload.current = false;
      return;
    }
    void loadList(
      {
        month,
        year,
        opcoId: opcoId || undefined,
        partnerId: partnerId || undefined,
        page: 1,
      },
      selectedIdRef.current,
    );
  }, [month, year, opcoId, partnerId, loadList]);

  const goToPage = (nextPage: number) => {
    void loadList(
      {
        month,
        year,
        opcoId: opcoId || undefined,
        partnerId: partnerId || undefined,
        page: nextPage,
      },
      selectedId,
    );
  };

  const clearFilters = () => {
    const period = getCurrentPeriod();
    skipAutoReload.current = true;
    setMonth(period.month);
    setYear(period.year);
    setOpcoId("");
    setPartnerId("");
    void loadList(
      {
        month: period.month,
        year: period.year,
        page: 1,
      },
      null,
    );
  };

  const yearOptions = getPeriodYearOptions();
  const maxMonth = getMaxMonthForYear(year);

  return (
    <PageCard>
      <PageHeader
        title="Dizlee - Invoices"
        description="Invoice lifecycle stepper and activity log per invoice."
      />

      <InvoicesTabs active="lifecycle" />

      <FilterToolbar className="mt-4">
        <div className="grid w-full gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm">
            <span className={ui.label}>Period (month)</span>
            <select
              value={month}
              onChange={(event) => setMonth(Number(event.target.value))}
              className={ui.select}
            >
              {MONTHS.slice(0, maxMonth).map((name, index) => (
                <option key={name} value={index + 1}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className={ui.label}>Year</span>
            <select
              value={year}
              onChange={(event) => {
                const nextYear = Number(event.target.value);
                setYear(nextYear);
                const capped = getMaxMonthForYear(nextYear);
                if (month > capped) setMonth(capped);
              }}
              className={ui.select}
            >
              {yearOptions.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className={ui.label}>OpCo</span>
            <select
              value={opcoId}
              onChange={(event) => setOpcoId(event.target.value)}
              className={ui.select}
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
            <span className={ui.label}>Partner</span>
            <select
              value={partnerId}
              onChange={(event) => setPartnerId(event.target.value)}
              className={ui.select}
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
        <div className="flex w-full gap-3">
          <Button variant="secondary" onClick={clearFilters}>
            Clear filters
          </Button>
        </div>
      </FilterToolbar>

      {error ? <div className={`mt-4 ${ui.alertError}`}>{error}</div> : null}

      {!error ? (
        <LoadingOverlay active={loading} className="mt-6 min-h-[12rem]">
        {result.items.length > 0 ? (
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="space-y-3">
              <DataTableFrame>
                <DataTable>
                  <DataTableHead>
                    <tr>
                      <DataTableTh>Invoice</DataTableTh>
                      <DataTableTh align="center">Status</DataTableTh>
                    </tr>
                  </DataTableHead>
                  <tbody>
                    {result.items.map((row: LifecycleListItem) => (
                      <tr
                        key={row.id}
                        className={cn(
                          ui.tableRowHover,
                          row.id === selectedId && "bg-surface-muted",
                          row.id !== selectedId && "cursor-pointer",
                        )}
                        onClick={() => handleSelect(row.id)}
                      >
                        <DataTableTd>
                          <p className="font-medium text-foreground">
                            {row.invoiceNumber ?? row.id}
                          </p>
                          <p className="text-xs text-foreground-subtle">
                            {row.direction} · {row.opcoName}
                            {row.partnerName ? ` / ${row.partnerName}` : ""}
                          </p>
                        </DataTableTd>
                        <DataTableTd align="center">
                          <StatusPill tone={invoiceStatusTone(row.invoiceStatus)}>
                            {row.invoiceStatus}
                          </StatusPill>
                        </DataTableTd>
                      </tr>
                    ))}
                  </tbody>
                </DataTable>
              </DataTableFrame>

              <div className="flex items-center justify-between text-sm text-foreground-muted">
                <p>
                  Page {result.page} / {result.totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    disabled={result.page <= 1}
                    onClick={() => goToPage(result.page - 1)}
                  >
                    Prev
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={result.page >= result.totalPages}
                    onClick={() => goToPage(result.page + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>

            <div className={ui.cardPadding}>
              {detailLoading ? (
                <p className="text-sm text-foreground-subtle">Loading lifecycle…</p>
              ) : detail ? (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-medium text-foreground">
                      {detail.invoice.invoiceNumber ?? "Invoice"}
                    </h2>
                    <p className="text-sm text-foreground-muted">
                      {detail.invoice.direction} · {detail.invoice.period.label}
                    </p>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-foreground-muted">Lifecycle</h3>
                    <ol className="mt-3 space-y-3">
                      {detail.steps.map((step, index) => (
                        <li key={step.code} className="flex gap-3">
                          <div
                            className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium ${
                              step.completed
                                ? "bg-success text-primary-foreground"
                                : "bg-primary-muted text-foreground-muted"
                            }`}
                          >
                            {index + 1}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {step.label}
                            </p>
                            <p className="text-xs text-foreground-subtle">
                              {formatAppDateTime(step.completedAt)}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ol>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-foreground-muted">
                      Activity log
                    </h3>
                    {detail.activities.length > 0 ? (
                      <ul className="mt-3 space-y-3">
                        {detail.activities.map((entry) => (
                          <li
                            key={entry.id}
                            className="rounded-2xl border border-border p-3 text-sm"
                          >
                            <p className="font-medium text-foreground">
                              {entry.action}
                            </p>
                            <p className="text-foreground-muted">
                              {entry.actorName} · {formatAppDateTime(entry.createdAt)}
                            </p>
                            {entry.previousStatus || entry.newStatus ? (
                              <p className="text-xs text-foreground-subtle">
                                {entry.statusField ?? "status"}:{" "}
                                {entry.previousStatus ?? "—"} →{" "}
                                {entry.newStatus ?? "—"}
                              </p>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 text-sm text-foreground-subtle">
                        No activity recorded yet.
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-foreground-subtle">Select an invoice.</p>
              )}
            </div>
          </div>
        ) : (
          <EmptyState
            className="mt-6"
            title="No invoices"
            description="Try adjusting filters or create an invoice for this period."
          />
        )}
        </LoadingOverlay>
      ) : null}
    </PageCard>
  );
}

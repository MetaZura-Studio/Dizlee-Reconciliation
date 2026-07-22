"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { InvoiceDetailModal } from "@/components/opco/InvoiceDetailModal";
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
import { IconButton } from "@/components/ui/icon-button";
import { IconEye, IconPrint } from "@/components/ui/icons";
import { ListSearch, OrFiltersDivider } from "@/components/ui/list-search";
import { LoadingOverlay } from "@/components/ui/loading";
import { FilterToolbar } from "@/components/ui/page";
import { StatusPill } from "@/components/ui/status-pill";
import { formatPeriodLabel, getDefaultPeriod } from "@/lib/opco/period";
import {
  getMaxMonthForYear,
  getPeriodYearOptions,
} from "@/lib/platform/period";
import { ui } from "@/lib/ui/classes";
import { nextSortState } from "@/lib/ui/sort";
import { invoiceStatusTone, paymentLabelTone } from "@/lib/ui/status-tones";
import { useDebouncedValue } from "@/lib/ui/use-debounced-value";
import type {
  OpcoInvoiceDetail,
  OpcoInvoiceFilterOptions,
  OpcoInvoiceListFilters,
  OpcoInvoiceListItem,
  OpcoInvoiceListResult,
  OpcoInvoicePaymentFilter,
  OpcoInvoiceSortField,
  OpcoSortDirection,
} from "@/lib/opco/queries/invoices";

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

function formatCurrency(amount: number, currencyCode: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode,
  }).format(amount);
}

function buildInvoicesQuery(filters: OpcoInvoiceListFilters): string {
  const params = new URLSearchParams({
    sortBy: filters.sortBy,
    sortDir: filters.sortDir,
    page: String(filters.page),
    paymentStatus: filters.paymentStatus,
  });

  if (filters.year !== undefined) {
    params.set("year", String(filters.year));
  }
  if (filters.month !== undefined) {
    params.set("month", String(filters.month));
  }
  if (filters.statusCode) {
    params.set("status", filters.statusCode);
  }
  if (filters.search) {
    params.set("search", filters.search);
  }

  return params.toString();
}

type InvoicesTableProps = {
  initialResult: OpcoInvoiceListResult;
  filterOptions: OpcoInvoiceFilterOptions;
};

export function InvoicesTable({
  initialResult,
  filterOptions: initialFilterOptions,
}: InvoicesTableProps) {
  const defaults = getDefaultPeriod();
  const { filters: initialFilters } = initialResult;

  const [year, setYear] = useState(
    initialFilters.year?.toString() ?? String(defaults.year),
  );
  const [month, setMonth] = useState(
    initialFilters.month?.toString() ?? String(defaults.month),
  );
  const [statusCode, setStatusCode] = useState(initialFilters.statusCode ?? "");
  const [paymentStatus, setPaymentStatus] = useState<OpcoInvoicePaymentFilter>(
    initialFilters.paymentStatus,
  );
  const [search, setSearch] = useState(initialFilters.search ?? "");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [sortBy, setSortBy] = useState<OpcoInvoiceSortField>(initialFilters.sortBy);
  const [sortDir, setSortDir] = useState<OpcoSortDirection>(initialFilters.sortDir);

  const [result, setResult] = useState(initialResult);
  const [filterOptions, setFilterOptions] = useState(initialFilterOptions);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const skipSearchEffect = useRef(true);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<OpcoInvoiceDetail | null>(null);
  const [justAcknowledged, setJustAcknowledged] = useState(false);

  const loadInvoices = useCallback(async (filters: OpcoInvoiceListFilters) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/opco/invoices?${buildInvoicesQuery(filters)}`,
      );
      const payload = (await response.json()) as {
        result?: OpcoInvoiceListResult;
        filterOptions?: OpcoInvoiceFilterOptions;
        error?: string;
      };
      if (!response.ok || !payload.result) {
        throw new Error(payload.error ?? "Failed to load invoices");
      }
      setResult(payload.result);
      if (payload.filterOptions) {
        setFilterOptions(payload.filterOptions);
      }
      setSortBy(payload.result.filters.sortBy);
      setSortDir(payload.result.filters.sortDir);
      setPaymentStatus(payload.result.filters.paymentStatus);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Failed to load invoices",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (value.trim()) {
      setStatusCode("");
      setPaymentStatus("all");
    }
  };

  const applyFilters = () => {
    if (search) {
      skipSearchEffect.current = true;
      setSearch("");
    }
    void loadInvoices({
      year: year ? Number(year) : undefined,
      month: month ? Number(month) : undefined,
      statusCode: statusCode || undefined,
      paymentStatus,
      search: undefined,
      sortBy,
      sortDir,
      page: 1,
    });
  };

  const applySort = (field: OpcoInvoiceSortField) => {
    const next = nextSortState(sortBy, sortDir, field);
    setSortBy(next.sortBy);
    setSortDir(next.sortDir);
    const term = debouncedSearch.trim();
    void loadInvoices({
      year: term ? result.filters.year : year ? Number(year) : result.filters.year,
      month: term
        ? result.filters.month
        : month
          ? Number(month)
          : result.filters.month,
      statusCode: term ? undefined : statusCode || result.filters.statusCode,
      paymentStatus: term ? "all" : paymentStatus,
      search: term || undefined,
      sortBy: next.sortBy,
      sortDir: next.sortDir,
      page: 1,
    });
  };

  const refresh = () => {
    void loadInvoices({ ...result.filters, page: 1 });
  };

  useEffect(() => {
    if (skipSearchEffect.current) {
      skipSearchEffect.current = false;
      return;
    }
    const term = debouncedSearch.trim();
    const timer = window.setTimeout(() => {
      void loadInvoices({
        year: result.filters.year,
        month: result.filters.month,
        statusCode: term ? undefined : result.filters.statusCode,
        paymentStatus: term ? "all" : result.filters.paymentStatus,
        search: term || undefined,
        sortBy: result.filters.sortBy,
        sortDir: result.filters.sortDir,
        page: 1,
      });
    }, 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- live search only
  }, [debouncedSearch, loadInvoices]);

  const goToPage = (nextPage: number) => {
    void loadInvoices({ ...result.filters, page: nextPage });
  };

  const openDetail = useCallback(
    async (invoiceId: string) => {
      setDetailOpen(true);
      setDetailLoading(true);
      setDetail(null);
      setJustAcknowledged(false);

      try {
        const response = await fetch(`/api/opco/invoices/${invoiceId}`);
        const payload = (await response.json()) as {
          detail?: OpcoInvoiceDetail;
          acknowledged?: boolean;
          error?: string;
        };

        if (response.ok && payload.detail) {
          setDetail(payload.detail);
          setJustAcknowledged(Boolean(payload.acknowledged));
          if (payload.acknowledged) {
            void loadInvoices({ ...result.filters });
          }
        }
      } catch {
        setDetail(null);
      } finally {
        setDetailLoading(false);
      }
    },
    [loadInvoices, result.filters],
  );

  function closeDetail() {
    setDetailOpen(false);
    setDetail(null);
    setJustAcknowledged(false);
  }

  const yearOptions = getPeriodYearOptions();
  const maxMonth = year === "" ? 12 : getMaxMonthForYear(Number(year));

  const showingFrom =
    result.totalCount === 0 ? 0 : (result.page - 1) * result.pageSize + 1;
  const showingTo = Math.min(result.page * result.pageSize, result.totalCount);

  return (
    <div className="space-y-4">
      <ListSearch
        value={search}
        onChange={handleSearchChange}
        placeholder="Invoice number"
        className="mt-0"
      />

      <OrFiltersDivider className="mt-0" />

      <FilterToolbar className="mt-4">
        <div className="grid w-full gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <label className="text-sm">
            <span className={ui.label}>Period (month)</span>
            <select
              value={month}
              onChange={(event) => setMonth(event.target.value)}
              className={ui.select}
            >
              <option value="">All months</option>
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
                const nextYear = event.target.value;
                setYear(nextYear);
                if (nextYear && month) {
                  const capped = getMaxMonthForYear(Number(nextYear));
                  if (Number(month) > capped) {
                    setMonth(String(capped));
                  }
                }
              }}
              className={ui.select}
            >
              <option value="">All years</option>
              {yearOptions.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className={ui.label}>Status</span>
            <select
              value={statusCode}
              onChange={(event) => setStatusCode(event.target.value)}
              className={ui.select}
            >
              <option value="">All statuses</option>
              {filterOptions.statuses.map((status) => (
                <option key={status.code} value={status.code}>
                  {status.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className={ui.label}>Payment</span>
            <select
              value={paymentStatus}
              onChange={(event) =>
                setPaymentStatus(event.target.value as OpcoInvoicePaymentFilter)
              }
              className={ui.select}
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
            </select>
          </label>
        </div>
        <div className="flex w-full gap-3">
          <Button onClick={applyFilters}>Apply filters</Button>
          <Button variant="secondary" onClick={refresh}>
            Refresh
          </Button>
        </div>
      </FilterToolbar>

      {error ? <div className={ui.alertError}>{error}</div> : null}

      {!error ? (
        <LoadingOverlay active={loading} className="mt-6 min-h-[12rem]">
        {result.items.length > 0 ? (
          <div className="mt-6 space-y-4">
            <DataTableFrame>
              <DataTable>
                <DataTableHead>
                  <tr>
                    <DataTableTh>Invoice #</DataTableTh>
                    <SortableDataTableTh
                      label="Period"
                      active={sortBy === "period"}
                      direction={sortDir}
                      onSort={() => applySort("period")}
                    />
                    <DataTableTh>Status</DataTableTh>
                    <DataTableTh>Payment</DataTableTh>
                    <DataTableTh>Total</DataTableTh>
                    <SortableDataTableTh
                      label="Issued"
                      active={sortBy === "uploaded"}
                      direction={sortDir}
                      onSort={() => applySort("uploaded")}
                    />
                    <DataTableTh>Actions</DataTableTh>
                  </tr>
                </DataTableHead>
                <tbody>
                  {result.items.map((invoice: OpcoInvoiceListItem) => (
                    <DataTableRow key={invoice.id}>
                      <DataTableTd className="align-top">
                        {invoice.invoiceNumber ?? "—"}
                      </DataTableTd>
                      <DataTableTd className="align-top">
                        {formatPeriodLabel(invoice.year, invoice.month)}
                      </DataTableTd>
                      <DataTableTd className="align-top">
                        <StatusPill tone={invoiceStatusTone(invoice.statusCode)}>
                          {invoice.statusLabel}
                        </StatusPill>
                      </DataTableTd>
                      <DataTableTd className="align-top">
                        <StatusPill
                          tone={paymentLabelTone(invoice.paymentStatusLabel)}
                        >
                          {invoice.paymentStatusLabel}
                        </StatusPill>
                      </DataTableTd>
                      <DataTableTd className="align-top">
                        {formatCurrency(invoice.totalAmount, invoice.currencyCode)}
                      </DataTableTd>
                      <DataTableTd className="align-top">
                        {new Date(invoice.issuedAt).toLocaleDateString("en-US", {
                          dateStyle: "medium",
                        })}
                      </DataTableTd>
                      <DataTableTd className="align-top">
                        <div className="flex gap-2">
                          <IconButton
                            label="View"
                            onClick={() => void openDetail(invoice.id)}
                          >
                            <IconEye />
                          </IconButton>
                          <Link
                            href={`/opco/invoices/${invoice.id}/print`}
                            target="_blank"
                            rel="noreferrer"
                            className={ui.iconButton}
                            title="Print"
                            aria-label="Print"
                          >
                            <IconPrint />
                          </Link>
                        </div>
                      </DataTableTd>
                    </DataTableRow>
                  ))}
                </tbody>
              </DataTable>
            </DataTableFrame>

            <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-foreground-muted">
              <p>
                Showing {showingFrom}–{showingTo} of {result.totalCount}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  disabled={result.page <= 1}
                  onClick={() => goToPage(result.page - 1)}
                >
                  Previous
                </Button>
                <span>
                  Page {result.page} of {result.totalPages}
                </span>
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
        ) : (
          <EmptyState title="No Dizlee → OpCo invoices match your filters" />
        )}
        </LoadingOverlay>
      ) : null}

      {detailOpen ? (
        <InvoiceDetailModal
          detail={detail}
          loading={detailLoading}
          justAcknowledged={justAcknowledged}
          onClose={closeDetail}
        />
      ) : null}
    </div>
  );
}

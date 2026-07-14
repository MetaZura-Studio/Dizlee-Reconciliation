"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { CreateOpcoInvoiceModal } from "@/components/dizlee/create-opco-invoice-modal";
import { InvoiceDetailModal } from "@/components/dizlee/invoice-detail-modal";
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
import { IconButton } from "@/components/ui/icon-button";
import { IconEye } from "@/components/ui/icons";
import { ListSearch, OrFiltersDivider } from "@/components/ui/list-search";
import { FilterToolbar, PageCard, PageHeader } from "@/components/ui/page";
import { StatusPill } from "@/components/ui/status-pill";
import { LoadingBar } from "@/components/ui/loading";
import { ui } from "@/lib/ui/classes";
import { nextSortState } from "@/lib/ui/sort";
import { useDebouncedValue } from "@/lib/ui/use-debounced-value";
import type {
  InvoiceDetail,
  InvoiceFilterOptions,
  InvoiceListFilters,
  InvoiceListItem,
  InvoiceListResult,
  InvoiceSortField,
  PaymentStatusFilter,
  SortDirection,
} from "@/lib/dizlee/invoices";

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

function formatMoney(amount: number, currencyCode: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 2,
  }).format(amount);
}

function paymentTone(status: string): "success" | "warning" | "neutral" {
  if (status === "PAID") {
    return "success";
  }
  if (status === "PENDING") {
    return "warning";
  }
  return "neutral";
}

function buildQuery(filters: InvoiceListFilters): string {
  const params = new URLSearchParams({
    month: String(filters.month),
    year: String(filters.year),
    paymentStatus: filters.paymentStatus,
    sortBy: filters.sortBy,
    sortDir: filters.sortDir,
    page: String(filters.page),
  });
  if (filters.opcoId) {
    params.set("opcoId", filters.opcoId);
  }
  if (filters.partnerId) {
    params.set("partnerId", filters.partnerId);
  }
  if (filters.search) {
    params.set("search", filters.search);
  }
  return params.toString();
}

type InvoicesListViewProps = {
  initialResult: InvoiceListResult;
  initialFilterOptions: InvoiceFilterOptions;
  fromDashboard?: boolean;
};

export function InvoicesListView({
  initialResult,
  initialFilterOptions,
  fromDashboard = false,
}: InvoicesListViewProps) {
  const [month, setMonth] = useState(initialResult.filters.month);
  const [year, setYear] = useState(initialResult.filters.year);
  const [opcoId, setOpcoId] = useState(initialResult.filters.opcoId ?? "");
  const [partnerId, setPartnerId] = useState(initialResult.filters.partnerId ?? "");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatusFilter>(
    initialResult.filters.paymentStatus,
  );
  const [search, setSearch] = useState(initialResult.filters.search ?? "");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [sortBy, setSortBy] = useState<InvoiceSortField>(initialResult.filters.sortBy);
  const [sortDir, setSortDir] = useState<SortDirection>(initialResult.filters.sortDir);

  const [result, setResult] = useState<InvoiceListResult>(initialResult);
  const [filterOptions, setFilterOptions] =
    useState<InvoiceFilterOptions>(initialFilterOptions);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<InvoiceDetail | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const skipAutoReload = useRef(true);

  const loadInvoices = useCallback(async (filters: InvoiceListFilters) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/dizlee/invoices?${buildQuery(filters)}`);
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to load invoices");
      }
      setResult(payload.data as InvoiceListResult);
      setFilterOptions(payload.filterOptions as InvoiceFilterOptions);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Failed to load invoices",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const searchTerm = debouncedSearch.trim();
  const usingSearch = Boolean(searchTerm);

  const currentFilters = (): InvoiceListFilters => ({
    month,
    year,
    opcoId: usingSearch ? undefined : opcoId || undefined,
    partnerId: usingSearch ? undefined : partnerId || undefined,
    paymentStatus: usingSearch ? "all" : paymentStatus,
    search: searchTerm || undefined,
    sortBy,
    sortDir,
    page: result.page,
  });

  const refresh = () => {
    void loadInvoices({ ...currentFilters(), page: 1 });
  };

  const applySort = (field: InvoiceSortField) => {
    const next = nextSortState(sortBy, sortDir, field);
    setSortBy(next.sortBy);
    setSortDir(next.sortDir);
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (value.trim()) {
      setOpcoId("");
      setPartnerId("");
      setPaymentStatus("all");
    }
  };

  useEffect(() => {
    if (skipAutoReload.current) {
      skipAutoReload.current = false;
      return;
    }
    const timer = window.setTimeout(() => {
      void loadInvoices({
        month,
        year,
        opcoId: usingSearch ? undefined : opcoId || undefined,
        partnerId: usingSearch ? undefined : partnerId || undefined,
        paymentStatus: usingSearch ? "all" : paymentStatus,
        search: searchTerm || undefined,
        sortBy,
        sortDir,
        page: 1,
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [
    month,
    year,
    opcoId,
    partnerId,
    paymentStatus,
    searchTerm,
    usingSearch,
    sortBy,
    sortDir,
    loadInvoices,
  ]);

  useEffect(() => {
    const handleFocus = () => {
      void loadInvoices({ ...result.filters, page: 1 });
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [loadInvoices, result.filters]);

  const goToPage = (nextPage: number) => {
    void loadInvoices({ ...currentFilters(), page: nextPage });
  };

  const openDetail = async (invoiceId: string) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetail(null);
    setPaymentError(null);
    try {
      const response = await fetch(`/api/dizlee/invoices/${invoiceId}`);
      const payload = (await response.json()) as {
        data: InvoiceDetail;
        acknowledged?: boolean;
      };
      if (!response.ok) {
        throw new Error(
          (payload as { error?: string }).error ?? "Failed to load invoice",
        );
      }
      setDetail(payload.data);
      if (payload.acknowledged) {
        setResult((prev) => ({
          ...prev,
          items: prev.items.map((item) =>
            item.id === invoiceId
              ? { ...item, invoiceStatus: "ACKNOWLEDGED" }
              : item,
          ),
        }));
      }
    } catch (detailError) {
      setError(
        detailError instanceof Error
          ? detailError.message
          : "Failed to load invoice",
      );
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const markPayment = async (invoiceId: string) => {
    setPaymentLoading(true);
    setPaymentError(null);
    try {
      const response = await fetch(
        `/api/dizlee/invoices/${invoiceId}/mark-payment`,
        { method: "POST" },
      );
      const payload = (await response.json()) as {
        data?: InvoiceDetail;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to mark payment");
      }
      if (payload.data) {
        setDetail(payload.data);
        setResult((prev) => ({
          ...prev,
          items: prev.items.map((item) =>
            item.id === invoiceId
              ? { ...item, paymentStatus: "PAID" }
              : item,
          ),
        }));
      }
    } catch (paymentErr) {
      setPaymentError(
        paymentErr instanceof Error
          ? paymentErr.message
          : "Failed to mark payment",
      );
    } finally {
      setPaymentLoading(false);
    }
  };

  const yearOptions = [];
  for (let value = year + 1; value >= year - 4; value -= 1) {
    yearOptions.push(value);
  }

  const items: InvoiceListItem[] = result.items;

  return (
    <PageCard>
      <PageHeader
        title="Dizlee - Invoices"
        description={
          fromDashboard
            ? "Partner → Dizlee and Dizlee → OpCo invoices for the selected period. From dashboard."
            : "Partner → Dizlee and Dizlee → OpCo invoices for the selected period."
        }
        actions={
          <Button onClick={() => setCreateOpen(true)}>Create invoice to OpCo</Button>
        }
      />

      <InvoicesTabs active="all" />

      <ListSearch
        value={search}
        onChange={handleSearchChange}
        placeholder="Invoice #, OpCo, or Partner"
      />

      <OrFiltersDivider />

      <FilterToolbar className="mt-4">
        <div className="grid w-full gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6">
          <label className="text-sm">
            <span className={ui.label}>Period (month)</span>
            <select
              value={month}
              onChange={(event) => {
                setSearch("");
                setMonth(Number(event.target.value));
              }}
              className={ui.select}
            >
              {MONTHS.map((name, index) => (
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
                setSearch("");
                setYear(Number(event.target.value));
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
              onChange={(event) => {
                setSearch("");
                setOpcoId(event.target.value);
              }}
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
              onChange={(event) => {
                setSearch("");
                setPartnerId(event.target.value);
              }}
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
          <label className="text-sm">
            <span className={ui.label}>Payment status</span>
            <select
              value={paymentStatus}
              onChange={(event) => {
                setSearch("");
                setPaymentStatus(event.target.value as PaymentStatusFilter);
              }}
              className={ui.select}
            >
              <option value="all">All</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
            </select>
          </label>
          <div className="flex items-end">
            <Button variant="secondary" onClick={refresh} className="w-full">
              Refresh
            </Button>
          </div>
        </div>
      </FilterToolbar>

      {loading ? (
        <div className="mt-4">
          <LoadingBar active />
        </div>
      ) : null}
      {error ? <div className={`mt-4 ${ui.alertError}`}>{error}</div> : null}

      {!loading && !error ? (
        items.length > 0 ? (
          <div className="mt-6 space-y-4">
            <DataTableFrame>
              <DataTable>
                <DataTableHead>
                  <tr>
                    <SortableDataTableTh
                      label="Period"
                      active={sortBy === "period"}
                      direction={sortDir}
                      onSort={() => applySort("period")}
                    />
                    <SortableDataTableTh
                      label="OpCo"
                      active={sortBy === "opco"}
                      direction={sortDir}
                      onSort={() => applySort("opco")}
                    />
                    <SortableDataTableTh
                      label="Partner"
                      active={sortBy === "partner"}
                      direction={sortDir}
                      onSort={() => applySort("partner")}
                    />
                    <DataTableTh>Direction</DataTableTh>
                    <DataTableTh>Invoice #</DataTableTh>
                    <DataTableTh>Invoice status</DataTableTh>
                    <DataTableTh>Payment</DataTableTh>
                    <SortableDataTableTh
                      label="Uploaded"
                      active={sortBy === "uploaded"}
                      direction={sortDir}
                      onSort={() => applySort("uploaded")}
                    />
                    <DataTableTh align="right">Total</DataTableTh>
                    <DataTableTh>Action</DataTableTh>
                  </tr>
                </DataTableHead>
                <tbody>
                  {items.map((row) => (
                    <DataTableRow key={row.id}>
                      <DataTableTd className="text-foreground-muted">
                        {formatPeriod(row.period.month, row.period.year)}
                      </DataTableTd>
                      <DataTableTd>{row.opcoName}</DataTableTd>
                      <DataTableTd>{row.partnerName ?? "—"}</DataTableTd>
                      <DataTableTd className="text-foreground-muted">
                        {row.direction}
                      </DataTableTd>
                      <DataTableTd className="text-foreground-muted">
                        {row.invoiceNumber ?? "—"}
                      </DataTableTd>
                      <DataTableTd>
                        <StatusPill tone="neutral">{row.invoiceStatus}</StatusPill>
                      </DataTableTd>
                      <DataTableTd>
                        <StatusPill tone={paymentTone(row.paymentStatus)}>
                          {row.paymentStatus}
                        </StatusPill>
                      </DataTableTd>
                      <DataTableTd className="text-foreground-muted">
                        {formatDateTime(row.uploadedAt)}
                      </DataTableTd>
                      <DataTableTd align="right">
                        {formatMoney(row.totalAmount, row.currencyCode)}
                      </DataTableTd>
                      <DataTableTd>
                        <IconButton
                          label="View invoice"
                          onClick={() => void openDetail(row.id)}
                        >
                          <IconEye />
                        </IconButton>
                      </DataTableTd>
                    </DataTableRow>
                  ))}
                </tbody>
              </DataTable>
            </DataTableFrame>

            <div className="flex items-center justify-between text-sm text-foreground-muted">
              <p>
                Page {result.page} / {result.totalPages} · Total{" "}
                {result.totalCount} records
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
        ) : (
          <EmptyState
            className="mt-6"
            title="No invoices"
            description="Try adjusting filters or upload an invoice as OpCo/Partner."
          />
        )
      ) : null}

      {detailOpen ? (
        <InvoiceDetailModal
          detail={detail}
          loading={detailLoading}
          actionLoading={paymentLoading}
          actionError={paymentError}
          onMarkPayment={(invoiceId) => void markPayment(invoiceId)}
          onClose={() => {
            setDetailOpen(false);
            setDetail(null);
            setPaymentError(null);
          }}
        />
      ) : null}

      <CreateOpcoInvoiceModal
        key={createOpen ? `create-${month}-${year}` : "closed"}
        open={createOpen}
        defaultMonth={month}
        defaultYear={year}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          void loadInvoices({ ...currentFilters(), page: 1 });
        }}
      />
    </PageCard>
  );
}

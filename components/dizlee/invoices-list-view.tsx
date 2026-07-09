"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { CreateOpcoInvoiceModal } from "@/components/dizlee/create-opco-invoice-modal";
import { InvoiceDetailModal } from "@/components/dizlee/invoice-detail-modal";
import { InvoicesTabs } from "@/components/dizlee/invoices-tabs";
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

  const currentFilters = (): InvoiceListFilters => ({
    month,
    year,
    opcoId: opcoId || undefined,
    partnerId: partnerId || undefined,
    paymentStatus,
    sortBy,
    sortDir,
    page: result.page,
  });

  const refresh = () => {
    void loadInvoices({ ...currentFilters(), page: 1 });
  };

  useEffect(() => {
    if (skipAutoReload.current) {
      skipAutoReload.current = false;
      return;
    }
    void loadInvoices({
      month,
      year,
      opcoId: opcoId || undefined,
      partnerId: partnerId || undefined,
      paymentStatus,
      sortBy,
      sortDir,
      page: 1,
    });
  }, [month, year, opcoId, partnerId, paymentStatus, sortBy, sortDir, loadInvoices]);

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
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Dizlee - Invoices</h1>
          <p className="mt-1 text-sm text-foreground-muted">
            Partner → Dizlee and Dizlee → OpCo invoices for the selected period.
          </p>
          {fromDashboard ? (
            <p className="mt-1 text-xs text-foreground-subtle">From dashboard</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
        >
          Create invoice to OpCo
        </button>
      </div>

      <InvoicesTabs active="all" />

      <section className="rounded-lg border border-border bg-surface-muted p-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-8">
          <label className="text-sm">
            <span className="mb-1 block text-xs text-foreground-subtle">Period (month)</span>
            <select
              value={month}
              onChange={(event) => setMonth(Number(event.target.value))}
              className="w-full rounded-md border border-border-strong px-3 py-1.5 text-sm"
            >
              {MONTHS.map((name, index) => (
                <option key={name} value={index + 1}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs text-foreground-subtle">Year</span>
            <select
              value={year}
              onChange={(event) => setYear(Number(event.target.value))}
              className="w-full rounded-md border border-border-strong px-3 py-1.5 text-sm"
            >
              {yearOptions.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs text-foreground-subtle">OpCo</span>
            <select
              value={opcoId}
              onChange={(event) => setOpcoId(event.target.value)}
              className="w-full rounded-md border border-border-strong px-3 py-1.5 text-sm"
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
            <span className="mb-1 block text-xs text-foreground-subtle">Partner</span>
            <select
              value={partnerId}
              onChange={(event) => setPartnerId(event.target.value)}
              className="w-full rounded-md border border-border-strong px-3 py-1.5 text-sm"
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
            <span className="mb-1 block text-xs text-foreground-subtle">Payment status</span>
            <select
              value={paymentStatus}
              onChange={(event) =>
                setPaymentStatus(event.target.value as PaymentStatusFilter)
              }
              className="w-full rounded-md border border-border-strong px-3 py-1.5 text-sm"
            >
              <option value="all">All</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs text-foreground-subtle">Sort by</span>
            <select
              value={sortBy}
              onChange={(event) =>
                setSortBy(event.target.value as InvoiceSortField)
              }
              className="w-full rounded-md border border-border-strong px-3 py-1.5 text-sm"
            >
              <option value="uploaded">Uploaded</option>
              <option value="period">Period</option>
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs text-foreground-subtle">Direction</span>
            <select
              value={sortDir}
              onChange={(event) =>
                setSortDir(event.target.value as SortDirection)
              }
              className="w-full rounded-md border border-border-strong px-3 py-1.5 text-sm"
            >
              <option value="desc">Desc</option>
              <option value="asc">Asc</option>
            </select>
          </label>
          <div className="flex items-end">
            <button
              type="button"
              onClick={refresh}
              className="w-full rounded-md border border-border-strong px-4 py-1.5 text-sm text-foreground-muted hover:bg-surface-muted"
            >
              Refresh
            </button>
          </div>
        </div>
      </section>

      {loading ? <p className="text-sm text-foreground-subtle">Loading invoices…</p> : null}
      {error ? (
        <div className="rounded-md border border-danger-border bg-danger-muted p-4 text-sm text-danger">
          {error}
        </div>
      ) : null}

      {!loading && !error ? (
        items.length > 0 ? (
          <>
            <div className="overflow-hidden rounded-lg border border-border">
              <table className="min-w-full divide-y divide-border text-sm">
                <thead className="bg-surface-muted">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-foreground-muted">
                      Period
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-foreground-muted">
                      OpCo
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-foreground-muted">
                      Partner
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-foreground-muted">
                      Direction
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-foreground-muted">
                      Invoice #
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-foreground-muted">
                      Invoice status
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-foreground-muted">
                      Payment
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-foreground-muted">
                      Uploaded
                    </th>
                    <th className="px-4 py-3 text-right font-medium text-foreground-muted">
                      Total
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-foreground-muted">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-surface">
                  {items.map((row) => (
                    <tr key={row.id}>
                      <td className="px-4 py-3 text-foreground-muted">
                        {formatPeriod(row.period.month, row.period.year)}
                      </td>
                      <td className="px-4 py-3 text-foreground">{row.opcoName}</td>
                      <td className="px-4 py-3 text-foreground">
                        {row.partnerName ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-foreground-muted">{row.direction}</td>
                      <td className="px-4 py-3 text-foreground-muted">
                        {row.invoiceNumber ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-foreground-muted">{row.invoiceStatus}</td>
                      <td className="px-4 py-3 text-foreground-muted">{row.paymentStatus}</td>
                      <td className="px-4 py-3 text-foreground-muted">
                        {formatDateTime(row.uploadedAt)}
                      </td>
                      <td className="px-4 py-3 text-right text-foreground">
                        {formatMoney(row.totalAmount, row.currencyCode)}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => void openDetail(row.id)}
                          className="text-sm text-foreground-muted underline hover:text-foreground"
                        >
                          View invoice
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between text-sm text-foreground-muted">
              <p>
                Page {result.page} / {result.totalPages} · Total{" "}
                {result.totalCount} records
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={result.page <= 1}
                  onClick={() => goToPage(result.page - 1)}
                  className="rounded-md border border-border-strong px-3 py-1 disabled:opacity-40"
                >
                  Prev
                </button>
                <button
                  type="button"
                  disabled={result.page >= result.totalPages}
                  onClick={() => goToPage(result.page + 1)}
                  className="rounded-md border border-border-strong px-3 py-1 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="rounded-lg border border-border bg-surface p-8 text-center">
            <p className="font-medium text-foreground">No invoices</p>
            <p className="mt-1 text-sm text-foreground-muted">
              Try adjusting filters or upload an invoice as OpCo/Partner.
            </p>
          </div>
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
    </div>
  );
}

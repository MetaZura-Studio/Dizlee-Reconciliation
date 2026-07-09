"use client";

import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

import { InvoiceDetailModal } from "@/components/partner/InvoiceDetailModal";
import { formatPeriodLabel } from "@/lib/partner/period";
import type {
  PartnerInvoiceDetail,
  PartnerInvoiceFilterOptions,
  PartnerInvoiceListFilters,
  PartnerInvoiceListItem,
  PartnerInvoiceListResult,
  PartnerInvoicePaymentFilter,
  PartnerInvoiceSortField,
  PartnerSortDirection,
} from "@/lib/partner/queries/invoices";

const MONTHS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

function formatCurrency(amount: number, currencyCode: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode,
  }).format(amount);
}

function buildInvoicesQuery(filters: PartnerInvoiceListFilters): string {
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
  if (filters.opcoId) {
    params.set("opcoId", filters.opcoId);
  }
  if (filters.statusCode) {
    params.set("status", filters.statusCode);
  }

  return params.toString();
}

type InvoicesTableProps = {
  initialResult: PartnerInvoiceListResult;
  filterOptions: PartnerInvoiceFilterOptions;
};

export function InvoicesTable({ initialResult, filterOptions }: InvoicesTableProps) {
  const router = useRouter();
  const { filters } = initialResult;

  const [year, setYear] = useState(filters.year?.toString() ?? "");
  const [month, setMonth] = useState(filters.month?.toString() ?? "");
  const [opcoId, setOpcoId] = useState(filters.opcoId ?? "");
  const [statusCode, setStatusCode] = useState(filters.statusCode ?? "");
  const [paymentStatus, setPaymentStatus] = useState<PartnerInvoicePaymentFilter>(
    filters.paymentStatus,
  );
  const [sortBy, setSortBy] = useState<PartnerInvoiceSortField>(filters.sortBy);
  const [sortDir, setSortDir] = useState<PartnerSortDirection>(filters.sortDir);

  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<PartnerInvoiceDetail | null>(null);

  function navigateWithFilters(nextFilters: PartnerInvoiceListFilters) {
    router.push(`/partner/invoices?${buildInvoicesQuery(nextFilters)}`);
  }

  function applyFilters() {
    navigateWithFilters({
      year: year ? Number(year) : undefined,
      month: month ? Number(month) : undefined,
      opcoId: opcoId || undefined,
      statusCode: statusCode || undefined,
      paymentStatus,
      sortBy,
      sortDir,
      page: 1,
    });
  }

  function clearFilters() {
    setYear("");
    setMonth("");
    setOpcoId("");
    setStatusCode("");
    setPaymentStatus("all");
    setSortBy("uploaded");
    setSortDir("desc");
    router.push("/partner/invoices");
  }

  const openDetail = useCallback(async (invoiceId: string) => {
    setSelectedInvoiceId(invoiceId);
    setDetailLoading(true);
    setDetail(null);

    try {
      const response = await fetch(`/api/partner/invoices/${invoiceId}`);
      const payload = (await response.json()) as {
        detail?: PartnerInvoiceDetail;
        error?: string;
      };

      if (response.ok && payload.detail) {
        setDetail(payload.detail);
      }
    } catch {
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  function closeDetail() {
    setSelectedInvoiceId(null);
    setDetail(null);
  }

  const columnHelper = createColumnHelper<PartnerInvoiceListItem>();

  const columns = useMemo(
    () => [
      columnHelper.accessor("invoiceNumber", {
        header: "Invoice #",
        cell: (info) => info.getValue() ?? "—",
      }),
      columnHelper.display({
        id: "period",
        header: "Period",
        cell: ({ row }) => formatPeriodLabel(row.original.year, row.original.month),
      }),
      columnHelper.accessor("opcoName", {
        header: "OpCo",
        cell: (info) => info.getValue(),
      }),
      columnHelper.accessor("statusLabel", {
        header: "Status",
        cell: (info) => (
          <span className="rounded-full bg-surface-muted px-2 py-1 text-xs font-medium text-foreground-muted">
            {info.getValue()}
          </span>
        ),
      }),
      columnHelper.accessor("paymentStatusLabel", {
        header: "Payment",
        cell: (info) => info.getValue(),
      }),
      columnHelper.display({
        id: "total",
        header: "Total",
        cell: ({ row }) =>
          formatCurrency(row.original.totalAmount, row.original.currencyCode),
      }),
      columnHelper.accessor("uploadedAt", {
        header: "Uploaded",
        cell: (info) =>
          new Date(info.getValue()).toLocaleDateString("en-US", {
            dateStyle: "medium",
          }),
      }),
      columnHelper.display({
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <button
            type="button"
            onClick={() => void openDetail(row.original.id)}
            className="rounded border border-border-strong px-3 py-1.5 text-xs font-medium text-foreground hover:bg-surface-muted"
          >
            View
          </button>
        ),
      }),
    ],
    [columnHelper, openDetail],
  );

  const table = useReactTable({
    data: initialResult.items,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: initialResult.totalPages,
  });

  const showingFrom =
    initialResult.totalCount === 0
      ? 0
      : (initialResult.page - 1) * initialResult.pageSize + 1;
  const showingTo = Math.min(
    initialResult.page * initialResult.pageSize,
    initialResult.totalCount,
  );

  return (
    <div className="space-y-4">
      <form
        className="grid gap-4 rounded-lg border border-border bg-surface p-4 md:grid-cols-2 xl:grid-cols-4"
        onSubmit={(event) => {
          event.preventDefault();
          applyFilters();
        }}
      >
        <div>
          <label htmlFor="invoices-year" className="text-sm font-medium text-foreground-muted">
            Year
          </label>
          <input
            id="invoices-year"
            type="number"
            min={2000}
            max={2100}
            value={year}
            onChange={(event) => setYear(event.target.value)}
            placeholder="All years"
            className="mt-1 block w-full rounded border border-border-strong px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="invoices-month" className="text-sm font-medium text-foreground-muted">
            Month
          </label>
          <select
            id="invoices-month"
            value={month}
            onChange={(event) => setMonth(event.target.value)}
            className="mt-1 block w-full rounded border border-border-strong px-3 py-2 text-sm"
          >
            <option value="">All months</option>
            {MONTHS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="invoices-opco" className="text-sm font-medium text-foreground-muted">
            OpCo
          </label>
          <select
            id="invoices-opco"
            value={opcoId}
            onChange={(event) => setOpcoId(event.target.value)}
            className="mt-1 block w-full rounded border border-border-strong px-3 py-2 text-sm"
          >
            <option value="">All OpCos</option>
            {filterOptions.opcos.map((opco) => (
              <option key={opco.id} value={opco.id}>
                {opco.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="invoices-status" className="text-sm font-medium text-foreground-muted">
            Status
          </label>
          <select
            id="invoices-status"
            value={statusCode}
            onChange={(event) => setStatusCode(event.target.value)}
            className="mt-1 block w-full rounded border border-border-strong px-3 py-2 text-sm"
          >
            <option value="">All statuses</option>
            {filterOptions.statuses.map((status) => (
              <option key={status.code} value={status.code}>
                {status.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="invoices-payment" className="text-sm font-medium text-foreground-muted">
            Payment
          </label>
          <select
            id="invoices-payment"
            value={paymentStatus}
            onChange={(event) =>
              setPaymentStatus(event.target.value as PartnerInvoicePaymentFilter)
            }
            className="mt-1 block w-full rounded border border-border-strong px-3 py-2 text-sm"
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
          </select>
        </div>
        <div>
          <label htmlFor="invoices-sort-by" className="text-sm font-medium text-foreground-muted">
            Sort by
          </label>
          <select
            id="invoices-sort-by"
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value as PartnerInvoiceSortField)}
            className="mt-1 block w-full rounded border border-border-strong px-3 py-2 text-sm"
          >
            <option value="uploaded">Upload date</option>
            <option value="period">Period</option>
          </select>
        </div>
        <div>
          <label htmlFor="invoices-sort-dir" className="text-sm font-medium text-foreground-muted">
            Order
          </label>
          <select
            id="invoices-sort-dir"
            value={sortDir}
            onChange={(event) => setSortDir(event.target.value as PartnerSortDirection)}
            className="mt-1 block w-full rounded border border-border-strong px-3 py-2 text-sm"
          >
            <option value="desc">Newest first</option>
            <option value="asc">Oldest first</option>
          </select>
        </div>
        <div className="flex items-end gap-2 md:col-span-2 xl:col-span-2">
          <button
            type="submit"
            className="rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
          >
            Apply filters
          </button>
          <button
            type="button"
            onClick={clearFilters}
            className="rounded border border-border-strong px-4 py-2 text-sm font-medium text-foreground-muted hover:bg-surface-muted"
          >
            Clear
          </button>
        </div>
      </form>

      {initialResult.totalCount === 0 ? (
        <div className="rounded-lg border border-border bg-surface p-6 text-sm text-foreground-muted">
          <p>No invoices match your filters.</p>
          <Link
            href="/partner/invoices/upload"
            className="mt-2 inline-block text-foreground underline"
          >
            Upload an invoice
          </Link>
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-lg border border-border bg-surface">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="bg-surface-muted text-left text-foreground-muted">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <th key={header.id} className="px-4 py-3 font-medium">
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className="divide-y divide-border">
                {table.getRowModel().rows.map((row) => (
                  <tr key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-3 align-top text-foreground">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-foreground-muted">
            <p>
              Showing {showingFrom}–{showingTo} of {initialResult.totalCount}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={initialResult.page <= 1}
                onClick={() =>
                  navigateWithFilters({
                    ...filters,
                    page: initialResult.page - 1,
                  })
                }
                className="rounded border border-border-strong px-3 py-1.5 disabled:opacity-40"
              >
                Previous
              </button>
              <span>
                Page {initialResult.page} of {initialResult.totalPages}
              </span>
              <button
                type="button"
                disabled={initialResult.page >= initialResult.totalPages}
                onClick={() =>
                  navigateWithFilters({
                    ...filters,
                    page: initialResult.page + 1,
                  })
                }
                className="rounded border border-border-strong px-3 py-1.5 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}

      {selectedInvoiceId ? (
        <InvoiceDetailModal
          key={selectedInvoiceId}
          invoiceId={selectedInvoiceId}
          detail={detail}
          loading={detailLoading}
          onClose={closeDetail}
        />
      ) : null}
    </div>
  );
}

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
import { FieldLabel, Input, Select } from "@/components/ui/field";
import { IconButton } from "@/components/ui/icon-button";
import { IconEye, IconPrint } from "@/components/ui/icons";
import { FilterToolbar } from "@/components/ui/page";
import { StatusPill } from "@/components/ui/status-pill";
import { formatPeriodLabel } from "@/lib/opco/period";
import { ui } from "@/lib/ui/classes";
import { nextSortState } from "@/lib/ui/sort";
import { invoiceStatusTone, paymentLabelTone } from "@/lib/ui/status-tones";
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

const SORTABLE_COLUMNS: Record<string, OpcoInvoiceSortField> = {
  partnerName: "partner",
  period: "period",
  issuedAt: "uploaded",
};

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
  if (filters.partnerId) {
    params.set("partnerId", filters.partnerId);
  }
  if (filters.statusCode) {
    params.set("status", filters.statusCode);
  }

  return params.toString();
}

type InvoicesTableProps = {
  initialResult: OpcoInvoiceListResult;
  filterOptions: OpcoInvoiceFilterOptions;
};

export function InvoicesTable({ initialResult, filterOptions }: InvoicesTableProps) {
  const router = useRouter();
  const { filters } = initialResult;

  const [year, setYear] = useState(filters.year?.toString() ?? "");
  const [month, setMonth] = useState(filters.month?.toString() ?? "");
  const [partnerId, setPartnerId] = useState(filters.partnerId ?? "");
  const [statusCode, setStatusCode] = useState(filters.statusCode ?? "");
  const [paymentStatus, setPaymentStatus] = useState<OpcoInvoicePaymentFilter>(
    filters.paymentStatus,
  );
  const [sortBy, setSortBy] = useState<OpcoInvoiceSortField>(filters.sortBy);
  const [sortDir, setSortDir] = useState<OpcoSortDirection>(filters.sortDir);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<OpcoInvoiceDetail | null>(null);
  const [justAcknowledged, setJustAcknowledged] = useState(false);

  function navigateWithFilters(nextFilters: OpcoInvoiceListFilters) {
    router.push(`/opco/invoices?${buildInvoicesQuery(nextFilters)}`);
  }

  function applyFilters() {
    navigateWithFilters({
      year: year ? Number(year) : undefined,
      month: month ? Number(month) : undefined,
      partnerId: partnerId || undefined,
      statusCode: statusCode || undefined,
      paymentStatus,
      sortBy,
      sortDir,
      page: 1,
    });
  }

  function applySort(field: OpcoInvoiceSortField) {
    const next = nextSortState(sortBy, sortDir, field);
    setSortBy(next.sortBy);
    setSortDir(next.sortDir);
    navigateWithFilters({
      year: year ? Number(year) : undefined,
      month: month ? Number(month) : undefined,
      partnerId: partnerId || undefined,
      statusCode: statusCode || undefined,
      paymentStatus,
      sortBy: next.sortBy,
      sortDir: next.sortDir,
      page: 1,
    });
  }

  function clearFilters() {
    setYear("");
    setMonth("");
    setPartnerId("");
    setStatusCode("");
    setPaymentStatus("all");
    setSortBy("uploaded");
    setSortDir("desc");
    router.push("/opco/invoices");
  }

  const openDetail = useCallback(async (invoiceId: string) => {
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
          router.refresh();
        }
      }
    } catch {
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }, [router]);

  function closeDetail() {
    setDetailOpen(false);
    setDetail(null);
    setJustAcknowledged(false);
  }

  const columnHelper = createColumnHelper<OpcoInvoiceListItem>();

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
      columnHelper.accessor("partnerName", {
        header: "Partner",
        cell: (info) => info.getValue() ?? "—",
      }),
      columnHelper.accessor("statusLabel", {
        header: "Status",
        cell: ({ row }) => (
          <StatusPill tone={invoiceStatusTone(row.original.statusCode)}>
            {row.original.statusLabel}
          </StatusPill>
        ),
      }),
      columnHelper.accessor("paymentStatusLabel", {
        header: "Payment",
        cell: (info) => (
          <StatusPill tone={paymentLabelTone(info.getValue())}>
            {info.getValue()}
          </StatusPill>
        ),
      }),
      columnHelper.display({
        id: "total",
        header: "Total",
        cell: ({ row }) =>
          formatCurrency(row.original.totalAmount, row.original.currencyCode),
      }),
      columnHelper.accessor("issuedAt", {
        header: "Issued",
        cell: (info) =>
          new Date(info.getValue()).toLocaleDateString("en-US", {
            dateStyle: "medium",
          }),
      }),
      columnHelper.display({
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <div className="flex gap-2">
            <IconButton
              label="View"
              onClick={() => void openDetail(row.original.id)}
            >
              <IconEye />
            </IconButton>
            <Link
              href={`/opco/invoices/${row.original.id}/print`}
              target="_blank"
              rel="noreferrer"
              className={ui.iconButton}
              title="Print"
              aria-label="Print"
            >
              <IconPrint />
            </Link>
          </div>
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
        onSubmit={(event) => {
          event.preventDefault();
          applyFilters();
        }}
      >
        <FilterToolbar>
          <div className="grid w-full gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <FieldLabel htmlFor="invoices-year">Year</FieldLabel>
              <Input
                id="invoices-year"
                type="number"
                min={2000}
                max={2100}
                value={year}
                onChange={(event) => setYear(event.target.value)}
                placeholder="All years"
              />
            </div>
            <div>
              <FieldLabel htmlFor="invoices-month">Month</FieldLabel>
              <Select
                id="invoices-month"
                value={month}
                onChange={(event) => setMonth(event.target.value)}
              >
                <option value="">All months</option>
                {MONTHS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <FieldLabel htmlFor="invoices-partner">Partner</FieldLabel>
              <Select
                id="invoices-partner"
                value={partnerId}
                onChange={(event) => setPartnerId(event.target.value)}
              >
                <option value="">All partners</option>
                {filterOptions.partners.map((partner) => (
                  <option key={partner.id} value={partner.id}>
                    {partner.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <FieldLabel htmlFor="invoices-status">Status</FieldLabel>
              <Select
                id="invoices-status"
                value={statusCode}
                onChange={(event) => setStatusCode(event.target.value)}
              >
                <option value="">All statuses</option>
                {filterOptions.statuses.map((status) => (
                  <option key={status.code} value={status.code}>
                    {status.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <FieldLabel htmlFor="invoices-payment">Payment</FieldLabel>
              <Select
                id="invoices-payment"
                value={paymentStatus}
                onChange={(event) =>
                  setPaymentStatus(event.target.value as OpcoInvoicePaymentFilter)
                }
              >
                <option value="all">All</option>
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
              </Select>
            </div>
          </div>
          <div className="flex w-full gap-2">
            <Button type="submit">Apply filters</Button>
            <Button type="button" variant="secondary" onClick={clearFilters}>
              Clear
            </Button>
          </div>
        </FilterToolbar>
      </form>

      {initialResult.totalCount === 0 ? (
        <EmptyState title="No Dizlee → OpCo invoices match your filters" />
      ) : (
        <>
          <DataTableFrame>
            <DataTable>
              <DataTableHead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                      const sortField = SORTABLE_COLUMNS[header.column.id];
                      if (sortField) {
                        return (
                          <SortableDataTableTh
                            key={header.id}
                            label={String(header.column.columnDef.header)}
                            active={sortBy === sortField}
                            direction={sortDir}
                            onSort={() => applySort(sortField)}
                          />
                        );
                      }
                      return (
                        <DataTableTh key={header.id}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext(),
                              )}
                        </DataTableTh>
                      );
                    })}
                  </tr>
                ))}
              </DataTableHead>
              <tbody>
                {table.getRowModel().rows.map((row) => (
                  <DataTableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <DataTableTd key={cell.id} className="align-top">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </DataTableTd>
                    ))}
                  </DataTableRow>
                ))}
              </tbody>
            </DataTable>
          </DataTableFrame>

          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-foreground-muted">
            <p>
              Showing {showingFrom}–{showingTo} of {initialResult.totalCount}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                disabled={initialResult.page <= 1}
                onClick={() =>
                  navigateWithFilters({
                    ...filters,
                    page: initialResult.page - 1,
                  })
                }
              >
                Previous
              </Button>
              <span>
                Page {initialResult.page} of {initialResult.totalPages}
              </span>
              <Button
                variant="secondary"
                disabled={initialResult.page >= initialResult.totalPages}
                onClick={() =>
                  navigateWithFilters({
                    ...filters,
                    page: initialResult.page + 1,
                  })
                }
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}

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

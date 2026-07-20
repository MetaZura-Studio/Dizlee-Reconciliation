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
import { IconButton } from "@/components/ui/icon-button";
import { IconEye } from "@/components/ui/icons";
import { FilterToolbar } from "@/components/ui/page";
import { StatusPill } from "@/components/ui/status-pill";
import { formatPeriodLabel } from "@/lib/partner/period";
import {
  getMaxMonthForYear,
  getPeriodYearOptions,
} from "@/lib/platform/period";
import { ui } from "@/lib/ui/classes";
import { nextSortState } from "@/lib/ui/sort";
import { invoiceStatusTone, paymentLabelTone } from "@/lib/ui/status-tones";
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

const SORTABLE_COLUMNS: Record<string, PartnerInvoiceSortField> = {
  opcoName: "opco",
  period: "period",
  uploadedAt: "uploaded",
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

  function applySort(field: PartnerInvoiceSortField) {
    const next = nextSortState(sortBy, sortDir, field);
    setSortBy(next.sortBy);
    setSortDir(next.sortDir);
    navigateWithFilters({
      year: year ? Number(year) : undefined,
      month: month ? Number(month) : undefined,
      opcoId: opcoId || undefined,
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
          <IconButton
            label="View"
            onClick={() => void openDetail(row.original.id)}
          >
            <IconEye />
          </IconButton>
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

  const yearOptions = getPeriodYearOptions();
  const maxMonth = year === "" ? 12 : getMaxMonthForYear(Number(year));

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
              <Select
                id="invoices-year"
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
              >
                <option value="">All years</option>
                {yearOptions.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <FieldLabel htmlFor="invoices-month">Month</FieldLabel>
              <Select
                id="invoices-month"
                value={month}
                onChange={(event) => setMonth(event.target.value)}
              >
                <option value="">All months</option>
                {MONTHS.filter((item) => item.value <= maxMonth).map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <FieldLabel htmlFor="invoices-opco">OpCo</FieldLabel>
              <Select
                id="invoices-opco"
                value={opcoId}
                onChange={(event) => setOpcoId(event.target.value)}
              >
                <option value="">All OpCos</option>
                {filterOptions.opcos.map((opco) => (
                  <option key={opco.id} value={opco.id}>
                    {opco.name}
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
                  setPaymentStatus(event.target.value as PartnerInvoicePaymentFilter)
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
        <EmptyState
          title="No invoices match your filters"
          action={
            <Link href="/partner/invoices/upload" className={ui.btnSecondary}>
              Upload an invoice
            </Link>
          }
        />
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

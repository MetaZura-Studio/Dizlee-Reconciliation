"use client";

import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { ReportDetailModal } from "@/components/partner/ReportDetailModal";
import { ReportReuploadDialog } from "@/components/partner/ReportReuploadDialog";
import { RequestChangeDialog } from "@/components/partner/RequestChangeDialog";
import { ReportFilenameLink } from "@/components/shared/report-filename-link";
import { formatPeriodLabel } from "@/lib/partner/period";
import type {
  PartnerReportDetail,
  PartnerReportFilterOptions,
  PartnerReportListFilters,
  PartnerReportListItem,
  PartnerReportListResult,
  PartnerReportSortField,
  PartnerSortDirection,
} from "@/lib/partner/queries/reports";

const REQUESTABLE_STATUSES = new Set(["SUBMITTED", "APPROVED", "RESUBMITTED"]);

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

function canRequestChange(report: PartnerReportListItem): boolean {
  return (
    REQUESTABLE_STATUSES.has(report.statusCode) && !report.hasPendingChangeRequest
  );
}

function buildReportsQuery(filters: PartnerReportListFilters): string {
  const params = new URLSearchParams({
    sortBy: filters.sortBy,
    sortDir: filters.sortDir,
    page: String(filters.page),
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

type ReportsTableProps = {
  initialResult: PartnerReportListResult;
  filterOptions: PartnerReportFilterOptions;
};

export function ReportsTable({ initialResult, filterOptions }: ReportsTableProps) {
  const router = useRouter();
  const { filters } = initialResult;

  const [year, setYear] = useState(filters.year?.toString() ?? "");
  const [month, setMonth] = useState(filters.month?.toString() ?? "");
  const [opcoId, setOpcoId] = useState(filters.opcoId ?? "");
  const [statusCode, setStatusCode] = useState(filters.statusCode ?? "");
  const [sortBy, setSortBy] = useState<PartnerReportSortField>(filters.sortBy);
  const [sortDir, setSortDir] = useState<PartnerSortDirection>(filters.sortDir);

  const [changeRequestReport, setChangeRequestReport] =
    useState<PartnerReportListItem | null>(null);
  const [reuploadReport, setReuploadReport] = useState<PartnerReportListItem | null>(
    null,
  );
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<PartnerReportDetail | null>(null);

  function navigateWithFilters(nextFilters: PartnerReportListFilters) {
    router.push(`/partner/reports?${buildReportsQuery(nextFilters)}`);
  }

  function applyFilters() {
    navigateWithFilters({
      year: year ? Number(year) : undefined,
      month: month ? Number(month) : undefined,
      opcoId: opcoId || undefined,
      statusCode: statusCode || undefined,
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
    setSortBy("uploaded");
    setSortDir("desc");
    router.push("/partner/reports");
  }

  async function openDetail(reportId: string) {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetail(null);

    try {
      const response = await fetch(`/api/partner/reports/${reportId}`);
      const payload = (await response.json()) as {
        detail?: PartnerReportDetail;
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
  }

  function closeDetail() {
    setDetailOpen(false);
    setDetail(null);
  }

  function handleRequestSuccess() {
    setSuccessMessage("Reupload request submitted. Dizlee has been notified.");
    router.refresh();
  }

  function handleReuploadSuccess() {
    setSuccessMessage("Corrected report uploaded successfully.");
    router.refresh();
  }

  const columnHelper = createColumnHelper<PartnerReportListItem>();

  const columns = useMemo(
    () => [
      columnHelper.accessor("opcoName", {
        header: "OpCo",
        cell: (info) => info.getValue(),
      }),
      columnHelper.display({
        id: "period",
        header: "Period",
        cell: ({ row }) => formatPeriodLabel(row.original.year, row.original.month),
      }),
      columnHelper.accessor("statusLabel", {
        header: "Status",
        cell: ({ row }) => (
          <div>
            <span className="rounded-full bg-surface-muted px-2 py-1 text-xs font-medium text-foreground-muted">
              {row.original.statusLabel}
            </span>
            {row.original.hasPendingChangeRequest ? (
              <p className="mt-1 text-xs text-warning">Reupload pending review</p>
            ) : null}
          </div>
        ),
      }),
      columnHelper.accessor("filename", {
        header: "File",
        cell: ({ row }) => (
          <ReportFilenameLink
            filename={row.original.filename}
            onClick={
              row.original.filename
                ? () => void openDetail(row.original.id)
                : undefined
            }
          />
        ),
      }),
      columnHelper.accessor("lineItemCount", {
        header: "Lines",
        cell: (info) => info.getValue(),
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
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void openDetail(row.original.id)}
              className="rounded border border-border-strong px-3 py-1.5 text-xs font-medium text-foreground hover:bg-surface-muted"
            >
              View
            </button>
            {canRequestChange(row.original) ? (
              <button
                type="button"
                onClick={() => setChangeRequestReport(row.original)}
                className="rounded border border-border-strong px-3 py-1.5 text-xs font-medium text-foreground hover:bg-surface-muted"
              >
                Request reupload
              </button>
            ) : null}
            {row.original.canReupload ? (
              <button
                type="button"
                onClick={() => setReuploadReport(row.original)}
                className="rounded border border-success-border bg-success-muted px-3 py-1.5 text-xs font-medium text-success hover:bg-success-muted"
              >
                Reupload corrected file
              </button>
            ) : null}
          </div>
        ),
      }),
    ],
    [columnHelper],
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
          <label htmlFor="reports-year" className="text-sm font-medium text-foreground-muted">
            Year
          </label>
          <input
            id="reports-year"
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
          <label htmlFor="reports-month" className="text-sm font-medium text-foreground-muted">
            Month
          </label>
          <select
            id="reports-month"
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
          <label htmlFor="reports-opco" className="text-sm font-medium text-foreground-muted">
            OpCo
          </label>
          <select
            id="reports-opco"
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
          <label htmlFor="reports-status" className="text-sm font-medium text-foreground-muted">
            Status
          </label>
          <select
            id="reports-status"
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
          <label htmlFor="reports-sort-by" className="text-sm font-medium text-foreground-muted">
            Sort by
          </label>
          <select
            id="reports-sort-by"
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value as PartnerReportSortField)}
            className="mt-1 block w-full rounded border border-border-strong px-3 py-2 text-sm"
          >
            <option value="uploaded">Upload date</option>
            <option value="period">Period</option>
            <option value="opco">OpCo</option>
          </select>
        </div>
        <div>
          <label htmlFor="reports-sort-dir" className="text-sm font-medium text-foreground-muted">
            Order
          </label>
          <select
            id="reports-sort-dir"
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

      {successMessage ? (
        <p className="rounded border border-success-border bg-success-muted px-4 py-3 text-sm text-success">
          {successMessage}
        </p>
      ) : null}

      {initialResult.totalCount === 0 ? (
        <div className="rounded-lg border border-border bg-surface p-6 text-sm text-foreground-muted">
          <p>No reports match your filters.</p>
          <Link href="/partner/upload" className="mt-2 inline-block text-foreground underline">
            Upload a report
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

      {changeRequestReport ? (
        <RequestChangeDialog
          report={changeRequestReport}
          onClose={() => setChangeRequestReport(null)}
          onSuccess={handleRequestSuccess}
        />
      ) : null}

      {reuploadReport ? (
        <ReportReuploadDialog
          report={reuploadReport}
          onClose={() => setReuploadReport(null)}
          onSuccess={handleReuploadSuccess}
        />
      ) : null}

      {detailOpen ? (
        <ReportDetailModal
          detail={detail}
          loading={detailLoading}
          onClose={closeDetail}
        />
      ) : null}
    </div>
  );
}

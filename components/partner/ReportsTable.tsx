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
import { IconEye, IconPencil, IconUpload } from "@/components/ui/icons";
import { FilterToolbar } from "@/components/ui/page";
import { StatusPill } from "@/components/ui/status-pill";
import { formatPeriodLabel } from "@/lib/partner/period";
import { ui } from "@/lib/ui/classes";
import { nextSortState } from "@/lib/ui/sort";
import { reportStatusTone } from "@/lib/ui/status-tones";
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

const SORTABLE_COLUMNS: Record<string, PartnerReportSortField> = {
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

  function applySort(field: PartnerReportSortField) {
    const next = nextSortState(sortBy, sortDir, field);
    setSortBy(next.sortBy);
    setSortDir(next.sortDir);
    navigateWithFilters({
      year: year ? Number(year) : undefined,
      month: month ? Number(month) : undefined,
      opcoId: opcoId || undefined,
      statusCode: statusCode || undefined,
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
            <StatusPill tone={reportStatusTone(row.original.statusCode)}>
              {row.original.statusLabel}
            </StatusPill>
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
          <div className="flex gap-2">
            <IconButton
              label="View"
              onClick={() => void openDetail(row.original.id)}
            >
              <IconEye />
            </IconButton>
            {canRequestChange(row.original) ? (
              <IconButton
                label="Request reupload"
                onClick={() => setChangeRequestReport(row.original)}
              >
                <IconPencil />
              </IconButton>
            ) : null}
            {row.original.canReupload ? (
              <IconButton
                label="Reupload corrected file"
                variant="primary"
                onClick={() => setReuploadReport(row.original)}
              >
                <IconUpload />
              </IconButton>
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
        onSubmit={(event) => {
          event.preventDefault();
          applyFilters();
        }}
      >
        <FilterToolbar>
          <div className="grid w-full gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <FieldLabel htmlFor="reports-year">Year</FieldLabel>
              <Input
                id="reports-year"
                type="number"
                min={2000}
                max={2100}
                value={year}
                onChange={(event) => setYear(event.target.value)}
                placeholder="All years"
              />
            </div>
            <div>
              <FieldLabel htmlFor="reports-month">Month</FieldLabel>
              <Select
                id="reports-month"
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
              <FieldLabel htmlFor="reports-opco">OpCo</FieldLabel>
              <Select
                id="reports-opco"
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
              <FieldLabel htmlFor="reports-status">Status</FieldLabel>
              <Select
                id="reports-status"
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
          </div>
          <div className="flex w-full gap-2">
            <Button type="submit">Apply filters</Button>
            <Button type="button" variant="secondary" onClick={clearFilters}>
              Clear
            </Button>
          </div>
        </FilterToolbar>
      </form>

      {successMessage ? (
        <p className={ui.alertSuccess}>{successMessage}</p>
      ) : null}

      {initialResult.totalCount === 0 ? (
        <EmptyState
          title="No reports match your filters"
          action={
            <Link href="/partner/upload" className={ui.btnSecondary}>
              Upload a report
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

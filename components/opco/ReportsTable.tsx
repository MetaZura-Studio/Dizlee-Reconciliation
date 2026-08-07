/**
 * OpCo-facing report list including own submissions and linked partner reports.
 * Supports preview, re-upload flows, and change requests where allowed.
 */

"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { ReportDetailModal } from "@/components/opco/ReportDetailModal";
import { ReportReuploadDialog } from "@/components/opco/ReportReuploadDialog";
import { RequestChangeDialog } from "@/components/opco/RequestChangeDialog";
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
import { IconButton } from "@/components/ui/icon-button";
import { IconEye, IconRefresh, IconUpload } from "@/components/ui/icons";
import { ListSearch, OrFiltersDivider } from "@/components/ui/list-search";
import { LoadingOverlay } from "@/components/ui/loading";
import { FilterToolbar } from "@/components/ui/page";
import { StatusPill } from "@/components/ui/status-pill";
import { useToast } from "@/components/ui/toast";
import { formatPeriodLabel, getDefaultPeriod } from "@/lib/opco/period";
import { reportRawFilePreviewUrl } from "@/lib/platform/reports/preview-url";
import {
  getMaxMonthForYear,
  getPeriodYearOptions,
} from "@/lib/platform/period";
import { ui } from "@/lib/ui/classes";
import { nextSortState } from "@/lib/ui/sort";
import { reportStatusTone } from "@/lib/ui/status-tones";
import { useDebouncedValue } from "@/lib/ui/use-debounced-value";
import type {
  OpcoReportDetail,
  OpcoReportFilterOptions,
  OpcoReportListFilters,
  OpcoReportListItem,
  OpcoReportListResult,
  OpcoReportSortField,
  OpcoSortDirection,
} from "@/lib/opco/queries/reports";

const REQUESTABLE_STATUSES = new Set(["SUBMITTED", "APPROVED", "RESUBMITTED"]);

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

function canRequestChange(report: OpcoReportListItem): boolean {
  return (
    REQUESTABLE_STATUSES.has(report.statusCode) && !report.hasPendingChangeRequest
  );
}

function buildReportsQuery(filters: OpcoReportListFilters): string {
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
  if (filters.partnerId) {
    params.set("partnerId", filters.partnerId);
  }
  if (filters.statusCode) {
    params.set("status", filters.statusCode);
  }
  if (filters.search) {
    params.set("search", filters.search);
  }

  return params.toString();
}

type ReportsTableProps = {
  initialResult: OpcoReportListResult;
  filterOptions: OpcoReportFilterOptions;
};

export function ReportsTable({
  initialResult,
  filterOptions: initialFilterOptions,
}: ReportsTableProps) {
  const defaults = getDefaultPeriod();
  const { filters: initialFilters } = initialResult;

  const [year, setYear] = useState(
    initialFilters.year?.toString() ?? String(defaults.year),
  );
  const [month, setMonth] = useState(
    initialFilters.month?.toString() ?? String(defaults.month),
  );
  const [partnerId, setPartnerId] = useState(initialFilters.partnerId ?? "");
  const [statusCode, setStatusCode] = useState(initialFilters.statusCode ?? "");
  const [search, setSearch] = useState(initialFilters.search ?? "");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [sortBy, setSortBy] = useState<OpcoReportSortField>(initialFilters.sortBy);
  const [sortDir, setSortDir] = useState<OpcoSortDirection>(initialFilters.sortDir);

  const [result, setResult] = useState(initialResult);
  const [filterOptions, setFilterOptions] = useState(initialFilterOptions);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const skipSearchEffect = useRef(true);

  const [changeRequestReport, setChangeRequestReport] =
    useState<OpcoReportListItem | null>(null);
  const [reuploadReport, setReuploadReport] = useState<OpcoReportListItem | null>(
    null,
  );
  const toast = useToast();

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<OpcoReportDetail | null>(null);

  const loadReports = useCallback(async (filters: OpcoReportListFilters) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/opco/reports?${buildReportsQuery(filters)}`);
      const payload = (await response.json()) as {
        result?: OpcoReportListResult;
        filterOptions?: OpcoReportFilterOptions;
        error?: string;
      };
      if (!response.ok || !payload.result) {
        throw new Error(payload.error ?? "Failed to load reports");
      }
      setResult(payload.result);
      if (payload.filterOptions) {
        setFilterOptions(payload.filterOptions);
      }
      setSortBy(payload.result.filters.sortBy);
      setSortDir(payload.result.filters.sortDir);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Failed to load reports",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (value.trim()) {
      setPartnerId("");
      setStatusCode("");
    }
  };

  const applyFilters = () => {
    if (search) {
      skipSearchEffect.current = true;
      setSearch("");
    }
    void loadReports({
      year: year ? Number(year) : undefined,
      month: month ? Number(month) : undefined,
      partnerId: partnerId || undefined,
      statusCode: statusCode || undefined,
      search: undefined,
      sortBy,
      sortDir,
      page: 1,
    });
  };

  const applySort = (field: OpcoReportSortField) => {
    const next = nextSortState(sortBy, sortDir, field);
    setSortBy(next.sortBy);
    setSortDir(next.sortDir);
    const term = debouncedSearch.trim();
    void loadReports({
      year: term ? result.filters.year : year ? Number(year) : result.filters.year,
      month: term
        ? result.filters.month
        : month
          ? Number(month)
          : result.filters.month,
      partnerId: term ? undefined : partnerId || result.filters.partnerId,
      statusCode: term ? undefined : statusCode || result.filters.statusCode,
      search: term || undefined,
      sortBy: next.sortBy,
      sortDir: next.sortDir,
      page: 1,
    });
  };

  const refresh = () => {
    void loadReports({ ...result.filters, page: 1 });
  };

  const clearFilters = () => {
    const period = getDefaultPeriod();
    skipSearchEffect.current = true;
    setYear(String(period.year));
    setMonth(String(period.month));
    setPartnerId("");
    setStatusCode("");
    setSearch("");
    setSortBy("uploaded");
    setSortDir("desc");
    void loadReports({
      year: period.year,
      month: period.month,
      sortBy: "uploaded",
      sortDir: "desc",
      page: 1,
    });
  };

  useEffect(() => {
    if (skipSearchEffect.current) {
      skipSearchEffect.current = false;
      return;
    }
    const term = debouncedSearch.trim();
    const timer = window.setTimeout(() => {
      void loadReports({
        year: result.filters.year,
        month: result.filters.month,
        partnerId: term ? undefined : result.filters.partnerId,
        statusCode: term ? undefined : result.filters.statusCode,
        search: term || undefined,
        sortBy: result.filters.sortBy,
        sortDir: result.filters.sortDir,
        page: 1,
      });
    }, 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- live search only
  }, [debouncedSearch, loadReports]);

  const goToPage = (nextPage: number) => {
    void loadReports({ ...result.filters, page: nextPage });
  };

  async function openDetail(reportId: string) {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetail(null);

    try {
      const response = await fetch(`/api/opco/reports/${reportId}`);
      const payload = (await response.json()) as {
        detail?: OpcoReportDetail;
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
    toast.success("Reupload request submitted. Dizlee has been notified.");
    void loadReports({ ...result.filters });
  }

  function handleReuploadSuccess() {
    toast.success("Corrected report uploaded successfully.");
    void loadReports({ ...result.filters });
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
        placeholder="Filename or Partner"
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
        </div>
        <div className="flex w-full gap-3">
          <Button onClick={applyFilters}>Apply filters</Button>
          <Button variant="secondary" onClick={clearFilters}>
            Clear filters
          </Button>
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
                    <SortableDataTableTh
                      label="Partner"
                      active={sortBy === "partner"}
                      direction={sortDir}
                      onSort={() => applySort("partner")}
                    />
                    <SortableDataTableTh
                      label="Period"
                      active={sortBy === "period"}
                      direction={sortDir}
                      onSort={() => applySort("period")}
                    />
                    <DataTableTh>Status</DataTableTh>
                    <DataTableTh>File</DataTableTh>
                    <DataTableTh>Lines</DataTableTh>
                    <SortableDataTableTh
                      label="Uploaded"
                      active={sortBy === "uploaded"}
                      direction={sortDir}
                      onSort={() => applySort("uploaded")}
                    />
                    <DataTableTh>Actions</DataTableTh>
                  </tr>
                </DataTableHead>
                <tbody>
                  {result.items.map((row) => (
                    <DataTableRow key={row.id}>
                      <DataTableTd>{row.partnerName}</DataTableTd>
                      <DataTableTd className="text-foreground-muted">
                        {formatPeriodLabel(row.year, row.month)}
                      </DataTableTd>
                      <DataTableTd>
                        <div>
                          <StatusPill tone={reportStatusTone(row.statusCode)}>
                            {row.statusLabel}
                          </StatusPill>
                          {row.hasPendingChangeRequest ? (
                            <p className="mt-1 text-xs text-warning">
                              Reupload pending review
                            </p>
                          ) : null}
                        </div>
                      </DataTableTd>
                      <DataTableTd className="text-foreground-muted">
                        <ReportFilenameLink
                          filename={row.filename}
                          href={
                            row.filename
                              ? reportRawFilePreviewUrl("opco", row.id)
                              : undefined
                          }
                        />
                      </DataTableTd>
                      <DataTableTd className="text-foreground-muted">
                        {row.lineItemCount}
                      </DataTableTd>
                      <DataTableTd className="text-foreground-muted">
                        {new Date(row.uploadedAt).toLocaleDateString("en-US", {
                          dateStyle: "medium",
                        })}
                      </DataTableTd>
                      <DataTableTd>
                        <div className="flex gap-2">
                          <IconButton
                            label="View parsed report"
                            onClick={() => void openDetail(row.id)}
                          >
                            <IconEye />
                          </IconButton>
                          {canRequestChange(row) ? (
                            <IconButton
                              label="Request reupload"
                              onClick={() => setChangeRequestReport(row)}
                            >
                              <IconRefresh />
                            </IconButton>
                          ) : null}
                          {row.canReupload ? (
                            <IconButton
                              label="Reupload corrected file"
                              variant="primary"
                              onClick={() => setReuploadReport(row)}
                            >
                              <IconUpload />
                            </IconButton>
                          ) : null}
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
          <EmptyState
            title="No reports match your filters"
            description="Try adjusting search or filters, or upload a new report."
            action={
              <Link href="/opco/upload" className={ui.btnSecondary}>
                Upload a report
              </Link>
            }
          />
        )}
        </LoadingOverlay>
      ) : null}

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

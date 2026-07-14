"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { ReportDetailModal } from "@/components/dizlee/report-detail-modal";
import { ReportsTabs } from "@/components/dizlee/reports-tabs";
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
import { IconEye } from "@/components/ui/icons";
import { ListSearch, OrFiltersDivider } from "@/components/ui/list-search";
import { LoadingBar } from "@/components/ui/loading";
import { FilterToolbar, PageCard, PageHeader } from "@/components/ui/page";
import { ui } from "@/lib/ui/classes";
import { nextSortState } from "@/lib/ui/sort";
import { useDebouncedValue } from "@/lib/ui/use-debounced-value";
import type {
  ReportDetail,
  ReportFilterOptions,
  ReportListFilters,
  ReportListItem,
  ReportListResult,
  ReportSortField,
  SortDirection,
} from "@/lib/dizlee/reports";

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

function buildQuery(filters: ReportListFilters): string {
  const params = new URLSearchParams({
    month: String(filters.month),
    year: String(filters.year),
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

type ReportsListViewProps = {
  initialResult: ReportListResult;
  initialFilterOptions: ReportFilterOptions;
  fromDashboard?: boolean;
  initialReportId?: string;
};

export function ReportsListView({
  initialResult,
  initialFilterOptions,
  fromDashboard = false,
  initialReportId,
}: ReportsListViewProps) {
  const [month, setMonth] = useState(initialResult.filters.month);
  const [year, setYear] = useState(initialResult.filters.year);
  const [opcoId, setOpcoId] = useState(initialResult.filters.opcoId ?? "");
  const [partnerId, setPartnerId] = useState(initialResult.filters.partnerId ?? "");
  const [search, setSearch] = useState(initialResult.filters.search ?? "");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [sortBy, setSortBy] = useState<ReportSortField>(initialResult.filters.sortBy);
  const [sortDir, setSortDir] = useState<SortDirection>(initialResult.filters.sortDir);

  const [result, setResult] = useState<ReportListResult>(initialResult);
  const [filterOptions, setFilterOptions] =
    useState<ReportFilterOptions>(initialFilterOptions);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<ReportDetail | null>(null);
  const openedInitialReport = useRef(false);
  const skipSearchEffect = useRef(true);

  const loadReports = useCallback(async (filters: ReportListFilters) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/dizlee/reports?${buildQuery(filters)}`);
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to load reports");
      }
      setResult(payload.data as ReportListResult);
      setFilterOptions(payload.filterOptions as ReportFilterOptions);
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
      setOpcoId("");
      setPartnerId("");
    }
  };

  const applyFilters = () => {
    if (search) {
      skipSearchEffect.current = true;
      setSearch("");
    }
    void loadReports({
      month,
      year,
      opcoId: opcoId || undefined,
      partnerId: partnerId || undefined,
      search: undefined,
      sortBy,
      sortDir,
      page: 1,
    });
  };

  const applySort = (field: ReportSortField) => {
    const next = nextSortState(sortBy, sortDir, field);
    setSortBy(next.sortBy);
    setSortDir(next.sortDir);
    const term = debouncedSearch.trim();
    void loadReports({
      month: result.filters.month,
      year: result.filters.year,
      opcoId: term ? undefined : result.filters.opcoId,
      partnerId: term ? undefined : result.filters.partnerId,
      search: term || undefined,
      sortBy: next.sortBy,
      sortDir: next.sortDir,
      page: 1,
    });
  };

  const refresh = () => {
    void loadReports({ ...result.filters, page: 1 });
  };

  useEffect(() => {
    if (skipSearchEffect.current) {
      skipSearchEffect.current = false;
      return;
    }
    const term = debouncedSearch.trim();
    const timer = window.setTimeout(() => {
      void loadReports({
        month: result.filters.month,
        year: result.filters.year,
        opcoId: term ? undefined : result.filters.opcoId,
        partnerId: term ? undefined : result.filters.partnerId,
        search: term || undefined,
        sortBy: result.filters.sortBy,
        sortDir: result.filters.sortDir,
        page: 1,
      });
    }, 0);
    return () => window.clearTimeout(timer);
    // Only re-run when the debounced keyword changes — filters use Apply.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional
  }, [debouncedSearch, loadReports]);

  useEffect(() => {
    const handleFocus = () => {
      void loadReports({ ...result.filters, page: 1 });
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [loadReports, result.filters]);

  const goToPage = (nextPage: number) => {
    void loadReports({ ...result.filters, page: nextPage });
  };

  const openDetail = async (reportId: string) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetail(null);
    try {
      const response = await fetch(`/api/dizlee/reports/${reportId}`);
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to load report");
      }
      setDetail(payload.data as ReportDetail);
    } catch (detailError) {
      setError(
        detailError instanceof Error
          ? detailError.message
          : "Failed to load report",
      );
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    if (!initialReportId || openedInitialReport.current) {
      return;
    }
    openedInitialReport.current = true;
    void openDetail(initialReportId);
  }, [initialReportId]);

  const yearOptions = [];
  for (let value = year + 1; value >= year - 4; value -= 1) {
    yearOptions.push(value);
  }

  const items: ReportListItem[] = result.items;

  return (
    <PageCard>
      <PageHeader
        title="Dizlee - Reports"
        description={
          fromDashboard
            ? "Submitted reports for this period — OpCo, Partner, uploader, and file details below."
            : undefined
        }
      />

      <ReportsTabs active="reports" />

      <ListSearch
        value={search}
        onChange={handleSearchChange}
        placeholder="Filename, OpCo, or Partner"
      />

      <OrFiltersDivider />

      <FilterToolbar className="mt-4">
        <div className="grid w-full gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <label className="text-sm">
            <span className={ui.label}>Period (month)</span>
            <select
              value={month}
              onChange={(event) => setMonth(Number(event.target.value))}
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
              onChange={(event) => setYear(Number(event.target.value))}
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
          <Button onClick={applyFilters}>Apply filters</Button>
          <Button variant="secondary" onClick={refresh}>
            Refresh
          </Button>
        </div>
      </FilterToolbar>

      <div className="mt-4">
        <LoadingBar active={loading} />
      </div>
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
                    <DataTableTh>OpCo</DataTableTh>
                    <DataTableTh>Partner</DataTableTh>
                    <SortableDataTableTh
                      label="Filename"
                      active={sortBy === "filename"}
                      direction={sortDir}
                      onSort={() => applySort("filename")}
                    />
                    <SortableDataTableTh
                      label="Uploaded"
                      active={sortBy === "uploaded"}
                      direction={sortDir}
                      onSort={() => applySort("uploaded")}
                    />
                    <DataTableTh>Uploaded by</DataTableTh>
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
                      <DataTableTd>{row.partnerName}</DataTableTd>
                      <DataTableTd className="text-foreground-muted">
                        <ReportFilenameLink
                          filename={row.filename}
                          onClick={
                            row.filename ? () => void openDetail(row.id) : undefined
                          }
                        />
                      </DataTableTd>
                      <DataTableTd className="text-foreground-muted">
                        {formatDateTime(row.uploadedAt)}
                      </DataTableTd>
                      <DataTableTd className="text-foreground-muted">
                        {row.uploadedBy}
                      </DataTableTd>
                      <DataTableTd>
                        <IconButton
                          label="View report"
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
            title="No reports"
            description="Try adjusting filters or upload a report as OpCo/Partner."
          />
        )
      ) : null}

      {detailOpen ? (
        <ReportDetailModal
          detail={detail}
          loading={detailLoading}
          onClose={() => {
            setDetailOpen(false);
            setDetail(null);
          }}
        />
      ) : null}
    </PageCard>
  );
}

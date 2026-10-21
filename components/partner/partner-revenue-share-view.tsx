/**
 * Partner list of Revenue Share reports received from Dizlee.
 */

"use client";

import { useCallback, useMemo, useState } from "react";

import { ReportRawFilePreviewModal } from "@/components/shared/report-raw-file-preview-modal";
import { IconButton } from "@/components/ui/icon-button";
import { IconDownload, IconEye } from "@/components/ui/icons";
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
import { FilterActions } from "@/components/ui/filter-actions";
import { ListPagination } from "@/components/ui/list-pagination";
import { FullPageLoading, LoadingOverlay } from "@/components/ui/loading";
import { FilterToolbar, PageCard, PageHeader } from "@/components/ui/page";
import { useToast } from "@/components/ui/toast";
import type { PartnerRsListItem } from "@/lib/dizlee/partner-revenue-share";
import { formatAppMonthYear } from "@/lib/platform/format-datetime";
import {
  getCurrentPeriod,
  getMaxMonthForYear,
  getPeriodYearOptions,
} from "@/lib/platform/period";
import { formatAppError } from "@/lib/errors/format";
import { paginateItems } from "@/lib/ui/list-pagination";
import { nextSortState, type SortDirection } from "@/lib/ui/sort";

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

type PartnerPortalRevenueShareViewProps = {
  initialMonth: number;
  initialYear: number;
  initialItems: PartnerRsListItem[];
};

type SortField = "opco" | "sentAt";

function periodQuery(month: number, year: number): string {
  return `month=${month}&year=${year}`;
}

function compareRows(
  a: PartnerRsListItem,
  b: PartnerRsListItem,
  sortBy: SortField,
  sortDir: SortDirection,
): number {
  const dir = sortDir === "asc" ? 1 : -1;
  if (sortBy === "sentAt") {
    return (new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime()) * dir;
  }
  return a.opcoName.localeCompare(b.opcoName) * dir;
}

export function PartnerPortalRevenueShareView({
  initialMonth,
  initialYear,
  initialItems,
}: PartnerPortalRevenueShareViewProps) {
  const toast = useToast();
  const [month, setMonth] = useState(initialMonth);
  const [year, setYear] = useState(initialYear);
  const [appliedMonth, setAppliedMonth] = useState(initialMonth);
  const [appliedYear, setAppliedYear] = useState(initialYear);
  const [items, setItems] = useState(initialItems);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortField>("sentAt");
  const [sortDir, setSortDir] = useState<SortDirection>("desc");
  const [page, setPage] = useState(1);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [previewFilename, setPreviewFilename] = useState("Partner RS report");
  const [previewSubtitle, setPreviewSubtitle] = useState<string | undefined>();
  const [previewDownloadHref, setPreviewDownloadHref] = useState<
    string | undefined
  >();

  const yearOptions = useMemo(() => getPeriodYearOptions(), []);
  const maxMonth = getMaxMonthForYear(year);

  const loadList = useCallback(async (nextMonth: number, nextYear: number) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/partner/revenue-share?${periodQuery(nextMonth, nextYear)}`,
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          formatAppError(payload, "Failed to load revenue share reports"),
        );
      }
      setItems((payload?.data?.items ?? []) as PartnerRsListItem[]);
      setAppliedMonth(nextMonth);
      setAppliedYear(nextYear);
      setPage(1);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load revenue share reports",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const sorted = useMemo(
    () => [...items].sort((a, b) => compareRows(a, b, sortBy, sortDir)),
    [items, sortBy, sortDir],
  );
  const paged = useMemo(() => paginateItems(sorted, page), [sorted, page]);

  function applySort(field: SortField) {
    const next = nextSortState(sortBy, sortDir, field);
    setSortBy(next.sortBy);
    setSortDir(next.sortDir);
    setPage(1);
  }

  function closePreview() {
    setPreviewOpen(false);
    setPreviewPdfUrl((current) => {
      if (current?.startsWith("blob:")) {
        URL.revokeObjectURL(current);
      }
      return null;
    });
    setPreviewError(null);
  }

  async function openPreview(row: PartnerRsListItem) {
    const downloadHref = `/api/partner/revenue-share/${row.id}/download`;
    const previewHref = `/api/partner/revenue-share/${row.id}/preview`;
    setPreviewOpen(true);
    setPreviewLoading(true);
    setPreviewError(null);
    setPreviewPdfUrl((current) => {
      if (current?.startsWith("blob:")) {
        URL.revokeObjectURL(current);
      }
      return null;
    });
    setPreviewFilename(row.filename);
    setPreviewSubtitle(`${row.opcoName} · ${row.periodLabel}`);
    setPreviewDownloadHref(downloadHref);

    try {
      const response = await fetch(previewHref);
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(
          formatAppError(payload, "Failed to load report preview"),
        );
      }
      // Blob URL — API responses send X-Frame-Options: DENY and cannot be iframe'd.
      const blob = await response.blob();
      setPreviewPdfUrl(URL.createObjectURL(blob));
    } catch (previewLoadError) {
      setPreviewError(
        previewLoadError instanceof Error
          ? previewLoadError.message
          : "Failed to load report preview",
      );
    } finally {
      setPreviewLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {loading ? (
        <FullPageLoading label="Loading revenue share reports…" />
      ) : null}
      <PageCard>
        <PageHeader
          title="Revenue Share"
          description="Revenue Share reports Dizlee sent you after OpCo reconciliation. Available for the last 3 months."
        />

        <FilterToolbar className="mt-6">
          <div className="grid min-w-0 w-full flex-1 gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
            <label className="text-sm">
              <FieldLabel>Month</FieldLabel>
              <Select
                value={String(month)}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  setMonth(next);
                  void loadList(next, year);
                }}
              >
                {MONTHS.slice(0, maxMonth).map((label, index) => (
                  <option key={label} value={index + 1}>
                    {label}
                  </option>
                ))}
              </Select>
            </label>
            <label className="text-sm">
              <FieldLabel>Year</FieldLabel>
              <Select
                value={String(year)}
                onChange={(event) => {
                  const nextYear = Number(event.target.value);
                  const nextMax = getMaxMonthForYear(nextYear);
                  const nextMonth = month > nextMax ? nextMax : month;
                  setYear(nextYear);
                  setMonth(nextMonth);
                  void loadList(nextMonth, nextYear);
                }}
              >
                {yearOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
            </label>
            <div className="flex flex-col justify-end text-sm">
              <span className="sr-only">Actions</span>
              <FilterActions
                className="sm:ml-0"
                onClear={() => {
                  const current = getCurrentPeriod();
                  setMonth(current.month);
                  setYear(current.year);
                  void loadList(current.month, current.year);
                }}
              />
            </div>
          </div>
        </FilterToolbar>

        {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}

        <div className="mt-6 space-y-4">
          <LoadingOverlay active={loading} label="Refreshing…">
            {sorted.length === 0 ? (
              <EmptyState
                title="No revenue share reports"
                description={`No reports received for ${formatAppMonthYear(appliedMonth, appliedYear)} yet.`}
              />
            ) : (
              <>
                <DataTableFrame>
                  <DataTable>
                    <DataTableHead>
                      <tr>
                        <SortableDataTableTh
                          label="OpCo"
                          active={sortBy === "opco"}
                          direction={sortDir}
                          onSort={() => applySort("opco")}
                        />
                        <DataTableTh>Period</DataTableTh>
                        <SortableDataTableTh
                          label="Received"
                          active={sortBy === "sentAt"}
                          direction={sortDir}
                          onSort={() => applySort("sentAt")}
                        />
                        <DataTableTh align="center">Actions</DataTableTh>
                      </tr>
                    </DataTableHead>
                    <tbody>
                      {paged.items.map((row) => (
                        <DataTableRow key={row.id}>
                          <DataTableTd className="font-medium text-foreground">
                            {row.opcoName}
                          </DataTableTd>
                          <DataTableTd className="text-foreground-muted">
                            {row.periodLabel}
                          </DataTableTd>
                          <DataTableTd className="text-foreground-muted">
                            {row.sentAtLabel}
                          </DataTableTd>
                          <DataTableTd align="center">
                            <div className="flex justify-center gap-2">
                              <IconButton
                                label="Preview report"
                                onClick={() => void openPreview(row)}
                              >
                                <IconEye />
                              </IconButton>
                              <IconButton
                                label="Download report"
                                onClick={() => {
                                  window.location.href = `/api/partner/revenue-share/${row.id}/download`;
                                  toast.success("Download started.");
                                }}
                              >
                                <IconDownload />
                              </IconButton>
                            </div>
                          </DataTableTd>
                        </DataTableRow>
                      ))}
                    </tbody>
                  </DataTable>
                </DataTableFrame>
                <ListPagination
                  total={paged.total}
                  page={paged.page}
                  totalPages={paged.totalPages}
                  noun="report"
                  onPageChange={setPage}
                />
              </>
            )}
          </LoadingOverlay>
        </div>
      </PageCard>

      {previewOpen ? (
        <ReportRawFilePreviewModal
          title="Revenue share report"
          filename={previewFilename}
          subtitle={previewSubtitle}
          downloadHref={previewDownloadHref}
          loading={previewLoading}
          error={previewError}
          pdfUrl={previewPdfUrl}
          onClose={closePreview}
        />
      ) : null}
    </div>
  );
}

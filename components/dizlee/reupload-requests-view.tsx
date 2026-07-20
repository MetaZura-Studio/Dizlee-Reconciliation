"use client";

import { useCallback, useEffect, useState } from "react";

import { ReportDetailModal } from "@/components/dizlee/report-detail-modal";
import { ReportsTabs } from "@/components/dizlee/reports-tabs";
import { ReportFilenameLink } from "@/components/shared/report-filename-link";
import { reportRawFilePreviewUrl } from "@/lib/platform/reports/preview-url";
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
import { Modal } from "@/components/ui/modal";
import { FilterToolbar, PageCard, PageHeader } from "@/components/ui/page";
import { LoadingBar } from "@/components/ui/loading";
import { cn, ui } from "@/lib/ui/classes";
import { nextSortState, type SortDirection } from "@/lib/ui/sort";
import type { ReportDetail, ReportFilterOptions } from "@/lib/dizlee/reports";
import {
  getMaxMonthForYear,
  getPeriodYearOptions,
} from "@/lib/platform/period";
import type {
  ReuploadListFilters,
  ReuploadListResult,
  ReuploadRequestItem,
  ReuploadSortField,
} from "@/lib/dizlee/reupload-requests";

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

function buildQuery(filters: ReuploadListFilters): string {
  const params = new URLSearchParams({
    month: String(filters.month),
    year: String(filters.year),
    page: String(filters.page),
    sortBy: filters.sortBy,
    sortDir: filters.sortDir,
  });
  if (filters.opcoId) {
    params.set("opcoId", filters.opcoId);
  }
  if (filters.partnerId) {
    params.set("partnerId", filters.partnerId);
  }
  return params.toString();
}

type ReuploadRequestsViewProps = {
  initialResult: ReuploadListResult;
  initialFilterOptions: ReportFilterOptions;
};

export function ReuploadRequestsView({
  initialResult,
  initialFilterOptions,
}: ReuploadRequestsViewProps) {
  const [month, setMonth] = useState(initialResult.filters.month);
  const [year, setYear] = useState(initialResult.filters.year);
  const [opcoId, setOpcoId] = useState(initialResult.filters.opcoId ?? "");
  const [partnerId, setPartnerId] = useState(
    initialResult.filters.partnerId ?? "",
  );
  const [sortBy, setSortBy] = useState<ReuploadSortField>(
    initialResult.filters.sortBy,
  );
  const [sortDir, setSortDir] = useState<SortDirection>(
    initialResult.filters.sortDir,
  );

  const [result, setResult] = useState<ReuploadListResult>(initialResult);
  const [filterOptions, setFilterOptions] =
    useState<ReportFilterOptions>(initialFilterOptions);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<ReuploadRequestItem | null>(
    null,
  );
  const [decisionNote, setDecisionNote] = useState("");
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<ReportDetail | null>(null);

  const loadRequests = useCallback(async (filters: ReuploadListFilters) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/dizlee/reupload-requests?${buildQuery(filters)}`,
      );
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to load reupload requests");
      }
      setResult(payload.data as ReuploadListResult);
      setFilterOptions(payload.filterOptions as ReportFilterOptions);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load reupload requests",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const applyFilters = () => {
    void loadRequests({
      month,
      year,
      opcoId: opcoId || undefined,
      partnerId: partnerId || undefined,
      page: 1,
      sortBy,
      sortDir,
    });
  };

  const applySort = (field: ReuploadSortField) => {
    const next = nextSortState(sortBy, sortDir, field);
    setSortBy(next.sortBy);
    setSortDir(next.sortDir);
    void loadRequests({
      ...result.filters,
      month,
      year,
      opcoId: opcoId || undefined,
      partnerId: partnerId || undefined,
      page: 1,
      sortBy: next.sortBy,
      sortDir: next.sortDir,
    });
  };

  const refresh = () => {
    void loadRequests({ ...result.filters, sortBy, sortDir, page: 1 });
  };

  useEffect(() => {
    const handleFocus = () => {
      void loadRequests({ ...result.filters, page: 1 });
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [loadRequests, result.filters]);

  const goToPage = (nextPage: number) => {
    void loadRequests({ ...result.filters, page: nextPage });
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

  const approve = async (requestId: string) => {
    setActionId(requestId);
    setError(null);
    try {
      const response = await fetch(
        `/api/dizlee/reupload-requests/${requestId}/approve`,
        { method: "PATCH" },
      );
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to approve request");
      }
      await loadRequests({ ...result.filters, page: result.page });
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Failed to approve request",
      );
    } finally {
      setActionId(null);
    }
  };

  const openReject = (item: ReuploadRequestItem) => {
    setRejectTarget(item);
    setDecisionNote("");
    setRejectOpen(true);
  };

  const confirmReject = async () => {
    if (!rejectTarget) {
      return;
    }

    setActionId(rejectTarget.id);
    setError(null);
    try {
      const response = await fetch(
        `/api/dizlee/reupload-requests/${rejectTarget.id}/reject`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ decisionNote }),
        },
      );
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to reject request");
      }
      setRejectOpen(false);
      setRejectTarget(null);
      await loadRequests({ ...result.filters, page: result.page });
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Failed to reject request",
      );
    } finally {
      setActionId(null);
    }
  };

  const yearOptions = getPeriodYearOptions();
  const maxMonth = getMaxMonthForYear(year);

  const items = result.items;

  return (
    <PageCard>
      <PageHeader title="Dizlee - Reports" />

      <ReportsTabs active="reupload" />

      <FilterToolbar className="mt-4">
        <div className="grid w-full gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm">
            <span className={ui.label}>Period (month)</span>
            <select
              value={month}
              onChange={(event) => setMonth(Number(event.target.value))}
              className={ui.select}
            >
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
                const nextYear = Number(event.target.value);
                setYear(nextYear);
                const capped = getMaxMonthForYear(nextYear);
                if (month > capped) setMonth(capped);
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
          <Button onClick={applyFilters}>Apply</Button>
          <Button variant="secondary" onClick={refresh}>
            Refresh
          </Button>
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
                      <DataTableTh>Filename</DataTableTh>
                      <DataTableTh>Requested by</DataTableTh>
                      <SortableDataTableTh
                        label="Requested"
                        active={sortBy === "requested"}
                        direction={sortDir}
                        onSort={() => applySort("requested")}
                      />
                      <DataTableTh>Reason</DataTableTh>
                      <DataTableTh>Actions</DataTableTh>
                    </tr>
                </DataTableHead>
                <tbody>
                  {items.map((row) => {
                    const busy = actionId === row.id;
                    return (
                      <DataTableRow key={row.id}>
                        <DataTableTd className="text-foreground-muted">
                          {formatPeriod(row.period.month, row.period.year)}
                        </DataTableTd>
                        <DataTableTd>{row.opcoName}</DataTableTd>
                        <DataTableTd>{row.partnerName}</DataTableTd>
                        <DataTableTd className="text-foreground-muted">
                          <ReportFilenameLink
                            filename={row.filename}
                            href={
                              row.filename
                                ? reportRawFilePreviewUrl("dizlee", row.reportId)
                                : undefined
                            }
                          />
                        </DataTableTd>
                        <DataTableTd className="text-foreground-muted">
                          {row.requestedBy}
                        </DataTableTd>
                        <DataTableTd className="text-foreground-muted">
                          {formatDateTime(row.requestedAt)}
                        </DataTableTd>
                        <DataTableTd className="max-w-xs text-foreground-muted">
                          {row.reason ?? "—"}
                        </DataTableTd>
                        <DataTableTd>
                          <div className="flex gap-2">
                            <Button
                              disabled={busy}
                              onClick={() => void approve(row.id)}
                            >
                              Approve
                            </Button>
                            <Button
                              variant="secondary"
                              disabled={busy}
                              onClick={() => openReject(row)}
                            >
                              Reject
                            </Button>
                          </div>
                        </DataTableTd>
                      </DataTableRow>
                    );
                  })}
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
            title="No pending reupload requests"
            description="Pending change requests from OpCos and Partners will appear here."
          />
        )
      ) : null}

      <Modal
        open={rejectOpen && rejectTarget !== null}
        title="Reject reupload request"
        onClose={() => {
          setRejectOpen(false);
          setRejectTarget(null);
        }}
      >
        {rejectTarget ? (
          <>
            <p className="text-sm text-foreground-muted">
              {rejectTarget.opcoName} / {rejectTarget.partnerName} ·{" "}
              {formatPeriod(rejectTarget.period.month, rejectTarget.period.year)}
            </p>
            <label className="mt-4 block text-sm">
              <span className={ui.label}>Decision note (optional)</span>
              <textarea
                value={decisionNote}
                onChange={(event) => setDecisionNote(event.target.value)}
                rows={3}
                className={cn(ui.input, "min-h-[5.5rem] resize-y py-2.5")}
              />
            </label>
            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() => {
                  setRejectOpen(false);
                  setRejectTarget(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                disabled={actionId === rejectTarget.id}
                onClick={() => void confirmReject()}
              >
                Reject request
              </Button>
            </div>
          </>
        ) : null}
      </Modal>

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

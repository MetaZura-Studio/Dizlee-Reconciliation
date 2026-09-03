/**
 * Queue of partner and OpCo file re-upload requests for Dizlee review.
 * Shows pending requests plus approved/rejected history for the selected period.
 */

"use client";

import { useCallback, useEffect, useState } from "react";

import { ReportsTabs } from "@/components/dizlee/reports-tabs";
import { ReportFilenameLink } from "@/components/shared/report-filename-link";
import {
  dizleeSubmissionRawFilePreviewUrl,
  reportRawFilePreviewUrl,
} from "@/lib/platform/reports/preview-url";
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
import { FilterActions } from "@/components/ui/filter-actions";
import { Modal } from "@/components/ui/modal";
import { FilterToolbar, PageCard, PageHeader } from "@/components/ui/page";
import { LoadingOverlay } from "@/components/ui/loading";
import { StatusPill } from "@/components/ui/status-pill";
import { cn, ui } from "@/lib/ui/classes";
import { nextSortState, type SortDirection } from "@/lib/ui/sort";
import { reportStatusTone } from "@/lib/ui/status-tones";
import type { ReportFilterOptions } from "@/lib/dizlee/reports";
import {
  getCurrentPeriod,
  getMaxMonthForYear,
  getPeriodYearOptions,
} from "@/lib/platform/period";
import type {  ReuploadListFilters,
  ReuploadListResult,
  ReuploadRequestItem,
  ReuploadSortField,
} from "@/lib/dizlee/reupload-requests";
import { formatAppDateTime, formatAppMonthYear } from "@/lib/platform/format-datetime";
import { formatAppError } from "@/lib/errors/format";

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
  const [approveOpen, setApproveOpen] = useState(false);
  const [approveTarget, setApproveTarget] = useState<ReuploadRequestItem | null>(
    null,
  );
  const [decisionNote, setDecisionNote] = useState("");

  const loadRequests = useCallback(async (filters: ReuploadListFilters) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/dizlee/reupload-requests?${buildQuery(filters)}`,
      );
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(formatAppError(payload, "Failed to load reupload requests"));
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

  const clearFilters = () => {
    const period = getCurrentPeriod();
    setMonth(period.month);
    setYear(period.year);
    setOpcoId("");
    setPartnerId("");
    setSortBy(initialResult.filters.sortBy);
    setSortDir(initialResult.filters.sortDir);
    void loadRequests({
      month: period.month,
      year: period.year,
      page: 1,
      sortBy: initialResult.filters.sortBy,
      sortDir: initialResult.filters.sortDir,
    });
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
        throw new Error(formatAppError(payload, "Failed to approve request"));
      }
      setApproveOpen(false);
      setApproveTarget(null);
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

  const openApprove = (item: ReuploadRequestItem) => {
    setApproveTarget(item);
    setApproveOpen(true);
  };

  const confirmApprove = async () => {
    if (!approveTarget) {
      return;
    }
    await approve(approveTarget.id);
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
        throw new Error(formatAppError(payload, "Failed to reject request"));
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
        <FilterActions
          onApply={applyFilters}
          onClear={clearFilters}
          onRefresh={refresh}
          loading={loading}
        />
      </FilterToolbar>

      {error ? <div className={`mt-4 ${ui.alertError}`}>{error}</div> : null}

      {!error ? (
        <LoadingOverlay active={loading} className="mt-6 min-h-[12rem]">
        {items.length > 0 ? (
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
                        align="center"
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
                        align="center"
                      />
                      <DataTableTh>Reason</DataTableTh>
                      <DataTableTh align="center">Status</DataTableTh>
                      <DataTableTh align="center">Actions</DataTableTh>
                    </tr>
                </DataTableHead>
                <tbody>
                  {items.map((row) => {
                    const busy = actionId === row.id;
                    const isPending = row.decisionStatus === "PENDING";
                    return (
                      <DataTableRow key={row.id}>
                        <DataTableTd className="text-foreground-muted" align="center">
                          {formatAppMonthYear(row.period.month, row.period.year)}
                        </DataTableTd>
                        <DataTableTd>{row.opcoName}</DataTableTd>
                        <DataTableTd>{row.partnerName}</DataTableTd>
                        <DataTableTd className="text-foreground-muted">
                          <ReportFilenameLink
                            filename={row.filename}
                            href={
                              row.filename
                                ? row.kind === "submission"
                                  ? dizleeSubmissionRawFilePreviewUrl(row.reportId)
                                  : reportRawFilePreviewUrl("dizlee", row.reportId)
                                : undefined
                            }
                          />
                        </DataTableTd>
                        <DataTableTd className="text-foreground-muted">
                          {row.requestedBy}
                        </DataTableTd>
                        <DataTableTd className="text-foreground-muted" align="center">
                          {formatAppDateTime(row.requestedAt)}
                        </DataTableTd>
                        <DataTableTd className="max-w-xs text-foreground-muted">
                          {row.reason ?? "—"}
                        </DataTableTd>
                        <DataTableTd align="center">
                          <StatusPill tone={reportStatusTone(row.decisionStatus)}>
                            {row.decisionLabel}
                          </StatusPill>
                        </DataTableTd>
                        <DataTableTd align="center">
                          {isPending ? (
                            <div className="flex justify-center gap-2">
                              <Button
                                disabled={busy}
                                onClick={() => openApprove(row)}
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
                          ) : null}
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
            title="No reupload requests"
            description="Change requests from OpCos and Partners for this period will appear here."
          />
        )}
        </LoadingOverlay>
      ) : null}

      <Modal
        open={approveOpen && approveTarget !== null}
        title="Approve reupload request"
        onClose={() => {
          if (actionId === approveTarget?.id) {
            return;
          }
          setApproveOpen(false);
          setApproveTarget(null);
        }}
      >
        {approveTarget ? (
          <>
            <p className="text-sm text-foreground-muted">
              {approveTarget.opcoName}
              {approveTarget.partnerName
                ? ` / ${approveTarget.partnerName}`
                : ""}{" "}
              ·{" "}
              {formatAppMonthYear(
                approveTarget.period.month,
                approveTarget.period.year,
              )}
            </p>
            <p className="mt-4 text-sm text-foreground">
              Approving lets the OpCo replace this monthly report. When they
              upload the new file,{" "}
              <span className="font-semibold">
                all reconciliations, consolidation, and revenue-share results
                for this OpCo and period will be permanently deleted
              </span>{" "}
              and must be redone from scratch.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="secondary"
                disabled={actionId === approveTarget.id}
                onClick={() => {
                  setApproveOpen(false);
                  setApproveTarget(null);
                }}
              >
                Cancel
              </Button>
              <Button
                disabled={actionId === approveTarget.id}
                onClick={() => void confirmApprove()}
              >
                {actionId === approveTarget.id ? "Approving…" : "Approve"}
              </Button>
            </div>
          </>
        ) : null}
      </Modal>

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
              {formatAppMonthYear(rejectTarget.period.month, rejectTarget.period.year)}
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
    </PageCard>
  );
}

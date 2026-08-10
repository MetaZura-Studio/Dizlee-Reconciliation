/**
 * Configure lanes, run reconciliation, and review match history for a period.
 * Primary workspace for comparing partner and OpCo submitted figures.
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { LaneRemindModal } from "@/components/dizlee/lane-remind-modal";
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
import { FieldLabel, Select } from "@/components/ui/field";
import { IconButton } from "@/components/ui/icon-button";
import { IconBell, IconEye } from "@/components/ui/icons";
import { FilterToolbar, PageCard, PageHeader } from "@/components/ui/page";
import { StatusPill } from "@/components/ui/status-pill";
import { useToast } from "@/components/ui/toast";
import { ListPagination } from "@/components/ui/list-pagination";
import { ListSearch, OrFiltersDivider } from "@/components/ui/list-search";
import { LoadingOverlay } from "@/components/ui/loading";
import { SuccessDialog } from "@/components/ui/success-dialog";
import type { ReportFilterOptions } from "@/lib/dizlee/reports";
import type {
  CompareLaneFilters,
  CompareLaneRow,
  CompareLaneSortField,
  CompareLaneStatusFilter,
  ReconciliationHistoryResult,
  ReconciliationHistorySortField,
  ReconciliationSearchBy,
  SortDirection,
} from "@/lib/dizlee/reconciliation";
import { ui } from "@/lib/ui/classes";
import { paginateItems } from "@/lib/ui/list-pagination";
import { nextSortState } from "@/lib/ui/sort";
import { useDebouncedValue } from "@/lib/ui/use-debounced-value";
import {
  getCurrentPeriod,
  getMaxMonthForYear,
  getPeriodYearOptions,
} from "@/lib/platform/period";
import { reportRawFilePreviewUrl } from "@/lib/platform/reports/preview-url";
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

function stateTone(
  state: CompareLaneRow["state"],
): "success" | "info" | "warning" | "neutral" {
  switch (state) {
    case "READY":
      return "success";
    case "RECONCILED":
      return "info";
    case "NO_OPCO_REPORT":
    case "NO_PARTNER_REPORT":
    case "MISSING":
      return "warning";
    default:
      return "neutral";
  }
}

function needsReportReminder(state: CompareLaneRow["state"]): boolean {
  return (
    state === "MISSING" ||
    state === "NO_OPCO_REPORT" ||
    state === "NO_PARTNER_REPORT"
  );
}

function lastReminderLabel(lane: CompareLaneRow): string {
  const times = [
    lane.lastOpcoReminderAt,
    lane.lastPartnerReminderAt,
    lane.lastOpcoIntimationAt,
    lane.lastPartnerIntimationAt,
  ].filter((value): value is string => Boolean(value));

  if (times.length === 0) {
    return "No reminders yet";
  }

  const latest = times.sort((a, b) => (a < b ? 1 : -1))[0];
  return `Last notice: ${formatDateTime(latest)}`;
}

function buildLaneQuery(filters: CompareLaneFilters): string {
  const params = new URLSearchParams({
    month: String(filters.month),
    year: String(filters.year),
    searchBy: filters.searchBy,
    sortBy: filters.sortBy,
    sortDir: filters.sortDir,
    status: filters.status,
  });
  if (filters.entityId) {
    params.set("entityId", filters.entityId);
  }
  if (filters.search) {
    params.set("search", filters.search);
  }
  return params.toString();
}

type ReconciliationViewProps = {
  initialTab: "compare" | "history";
  initialCompareFilters: CompareLaneFilters;
  initialLanes: CompareLaneRow[];
  initialFilterOptions: ReportFilterOptions;
  initialTolerancePercent: number;
  initialHistory: ReconciliationHistoryResult;
};

export function ReconciliationView({
  initialTab,
  initialCompareFilters,
  initialLanes,
  initialFilterOptions,
  initialTolerancePercent,
  initialHistory,
}: ReconciliationViewProps) {
  const router = useRouter();
  const openReconciliationResult = (id: number | string) => {
    router.push(`/dizlee/reconciliation/${id}`);
  };
  const [activeTab, setActiveTab] = useState<"compare" | "history">(initialTab);
  const [month, setMonth] = useState(initialCompareFilters.month);
  const [year, setYear] = useState(initialCompareFilters.year);
  const [searchBy, setSearchBy] = useState<ReconciliationSearchBy>(
    initialCompareFilters.searchBy,
  );
  const [entityId, setEntityId] = useState(initialCompareFilters.entityId ?? "");
  const [laneStatus, setLaneStatus] = useState<CompareLaneStatusFilter>(
    initialCompareFilters.status,
  );
  const [laneSearch, setLaneSearch] = useState(initialCompareFilters.search ?? "");
  const debouncedLaneSearch = useDebouncedValue(laneSearch, 300);
  const [historySearch, setHistorySearch] = useState("");
  const debouncedHistorySearch = useDebouncedValue(historySearch, 300);
  const [compareSortBy, setCompareSortBy] = useState<CompareLaneSortField>(
    initialCompareFilters.sortBy,
  );
  const [compareSortDir, setCompareSortDir] = useState<SortDirection>(
    initialCompareFilters.sortDir,
  );
  const [historySortBy, setHistorySortBy] = useState<ReconciliationHistorySortField>(
    initialHistory.sortBy ?? "runAt",
  );
  const [historySortDir, setHistorySortDir] = useState<SortDirection>(
    initialHistory.sortDir ?? "desc",
  );
  const skipLaneSearchEffect = useRef(true);
  const skipHistorySearchEffect = useRef(true);

  const [lanes, setLanes] = useState(initialLanes);
  const [lanePage, setLanePage] = useState(1);
  const [filterOptions, setFilterOptions] =
    useState<ReportFilterOptions>(initialFilterOptions);
  const [tolerancePercent, setTolerancePercent] = useState(
    initialTolerancePercent,
  );
  const [history, setHistory] = useState(initialHistory);
  const pagedLanes = paginateItems(lanes, lanePage);

  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();
  const [remindLane, setRemindLane] = useState<CompareLaneRow | null>(null);
  const [reconcilingLabel, setReconcilingLabel] = useState<string | null>(null);
  const [runSuccess, setRunSuccess] = useState<{
    id: number;
    message: string;
  } | null>(null);

  const loadLanes = useCallback(async (filters: CompareLaneFilters) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/dizlee/reconciliation/lanes?${buildLaneQuery(filters)}`,
      );
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(formatAppError(payload, "Failed to load lanes"));
      }
      setLanes(payload.data as CompareLaneRow[]);
      setLanePage(1);
      setFilterOptions(payload.filterOptions as ReportFilterOptions);
      setTolerancePercent(payload.tolerancePercent as number);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Failed to load lanes",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const loadHistory = useCallback(async (
    page = 1,
    search = debouncedHistorySearch,
    sortBy = historySortBy,
    sortDir = historySortDir,
  ) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        sortBy,
        sortDir,
      });
      const term = search.trim();
      if (term) {
        params.set("search", term);
      }
      const response = await fetch(`/api/dizlee/reconciliation/history?${params}`);
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(formatAppError(payload, "Failed to load history"));
      }
      const data = payload.data as ReconciliationHistoryResult;
      setHistory(data);
      setHistorySortBy(data.sortBy);
      setHistorySortDir(data.sortDir);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Failed to load history",
      );
    } finally {
      setLoading(false);
    }
  }, [debouncedHistorySearch, historySortBy, historySortDir]);

  const applyCompareFilters = () => {
    if (laneSearch) {
      skipLaneSearchEffect.current = true;
      setLaneSearch("");
    }
    void loadLanes({
      month,
      year,
      searchBy,
      entityId: entityId || undefined,
      search: undefined,
      status: laneStatus,
      sortBy: compareSortBy,
      sortDir: compareSortDir,
    });
  };

  const clearCompareFilters = () => {
    const period = getCurrentPeriod();
    skipLaneSearchEffect.current = true;
    setLaneSearch("");
    setMonth(period.month);
    setYear(period.year);
    setSearchBy("opco");
    setEntityId("");
    setLaneStatus("all");
    setCompareSortBy(initialCompareFilters.sortBy);
    setCompareSortDir(initialCompareFilters.sortDir);
    void loadLanes({
      month: period.month,
      year: period.year,
      searchBy: "opco",
      entityId: undefined,
      search: undefined,
      status: "all",
      sortBy: initialCompareFilters.sortBy,
      sortDir: initialCompareFilters.sortDir,
    });
  };

  const clearHistoryFilters = () => {
    skipHistorySearchEffect.current = true;
    setHistorySearch("");
    const defaultSortBy = initialHistory.sortBy ?? "runAt";
    const defaultSortDir = initialHistory.sortDir ?? "desc";
    setHistorySortBy(defaultSortBy);
    setHistorySortDir(defaultSortDir);
    void loadHistory(1, "", defaultSortBy, defaultSortDir);
  };

  const applyCompareSort = (field: CompareLaneSortField) => {
    const next = nextSortState(compareSortBy, compareSortDir, field);
    setCompareSortBy(next.sortBy);
    setCompareSortDir(next.sortDir);
    void loadLanes({
      month,
      year,
      searchBy,
      entityId: laneSearch.trim() ? undefined : entityId || undefined,
      search: laneSearch.trim() || undefined,
      status: laneStatus,
      sortBy: next.sortBy,
      sortDir: next.sortDir,
    });
  };

  const applyHistorySort = (field: ReconciliationHistorySortField) => {
    const next = nextSortState(historySortBy, historySortDir, field);
    setHistorySortBy(next.sortBy);
    setHistorySortDir(next.sortDir);
    void loadHistory(1, debouncedHistorySearch, next.sortBy, next.sortDir);
  };

  // Debounced lane search — intentionally omit sort/status/period (Apply / sort handlers load those).
  useEffect(() => {
    if (skipLaneSearchEffect.current) {
      skipLaneSearchEffect.current = false;
      return;
    }
    if (activeTab !== "compare") {
      return;
    }
    const term = debouncedLaneSearch.trim();
    const timer = window.setTimeout(() => {
      void loadLanes({
        month,
        year,
        searchBy,
        entityId: term ? undefined : entityId || undefined,
        search: term || undefined,
        status: laneStatus,
        sortBy: compareSortBy,
        sortDir: compareSortDir,
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [debouncedLaneSearch, loadLanes, activeTab]); // eslint-disable-line react-hooks/exhaustive-deps -- live search only

  useEffect(() => {
    if (skipHistorySearchEffect.current) {
      skipHistorySearchEffect.current = false;
      return;
    }
    if (activeTab !== "history") {
      return;
    }
    const timer = window.setTimeout(() => {
      void loadHistory(1, debouncedHistorySearch);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [debouncedHistorySearch, loadHistory, activeTab]);

  const runReconciliation = async (lane: CompareLaneRow) => {
    const key = `${lane.opcoId}-${lane.partnerId}`;
    setActionId(key);
    setReconcilingLabel(`${lane.opcoName} / ${lane.partnerName}`);
    setError(null);
    try {
      const response = await fetch("/api/dizlee/reconciliation/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month: lane.period.month,
          year: lane.period.year,
          opcoId: lane.opcoId,
          partnerId: lane.partnerId,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(formatAppError(payload, "Failed to run reconciliation"));
      }
      await loadLanes({
        month,
        year,
        searchBy,
        entityId: debouncedLaneSearch.trim() ? undefined : entityId || undefined,
        search: debouncedLaneSearch.trim() || undefined,
        status: laneStatus,
        sortBy: compareSortBy,
        sortDir: compareSortDir,
      });
      setRunSuccess({
        id: payload.data.id as number,
        message:
          (payload.data.message as string | undefined) ??
          "Reconciliation completed successfully.",
      });
    } catch (runError) {
      setError(
        runError instanceof Error ? runError.message : "Failed to run reconciliation",
      );
    } finally {
      setActionId(null);
      setReconcilingLabel(null);
    }
  };

  useEffect(() => {
    const handleFocus = () => {
      if (activeTab === "compare") {
        const term = debouncedLaneSearch.trim();
        void loadLanes({
          month,
          year,
          searchBy,
          entityId: term ? undefined : entityId || undefined,
          search: term || undefined,
          status: laneStatus,
          sortBy: compareSortBy,
          sortDir: compareSortDir,
        });
      } else {
        void loadHistory(history.page);
      }
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [
    activeTab,
    compareSortBy,
    compareSortDir,
    debouncedLaneSearch,
    entityId,
    history.page,
    laneStatus,
    loadHistory,
    loadLanes,
    month,
    searchBy,
    year,
  ]);

  const yearOptions = getPeriodYearOptions();
  const maxMonth = getMaxMonthForYear(year);

  const entityOptions =
    searchBy === "opco" ? filterOptions.opcos : filterOptions.partners;

  return (
    <div className={reconcilingLabel ? "cursor-wait" : undefined}>
      {reconcilingLabel ? (
        <div
          className="fixed inset-0 z-[60] flex cursor-wait items-center justify-center bg-black/50 p-4"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <div className="w-full max-w-md rounded-[28px] border border-border bg-surface p-6 shadow-[var(--shadow-md)] text-center shadow-xl">
            <div
              className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-border-strong border-t-primary"
              aria-hidden="true"
            />
            <h2 className="mt-4 text-lg font-semibold text-foreground">
              Reconciliation in progress
            </h2>
            <p className="mt-2 text-sm text-foreground-muted">
              Comparing OpCo and Partner reports for{" "}
              <span className="font-medium text-foreground">{reconcilingLabel}</span>.
              Please wait…
            </p>
          </div>
        </div>
      ) : null}

      <PageCard>
        <PageHeader
          title="Reconciliation"
          description={`Compare OpCo and Partner reports for each pair. Tolerance: ${tolerancePercent}%`}
        />

        <div className="border-b border-border">
          <nav className="-mb-px flex gap-6">
            {[
              { id: "compare" as const, label: "Compare Reports" },
              { id: "history" as const, label: "History" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id);
                  if (tab.id === "history") {
                    void loadHistory(1);
                  }
                }}
                className={`border-b-2 px-1 pb-3 text-sm font-medium ${
                  activeTab === tab.id
                    ? "border-primary text-foreground"
                    : "border-transparent text-foreground-subtle hover:text-foreground-muted"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {error ? <p className={`mt-6 ${ui.alertError}`}>{error}</p> : null}

        {activeTab === "compare" ? (
          <>
            <ListSearch
              className="mt-6"
              value={laneSearch}
              onChange={(value) => {
                setLaneSearch(value);
                if (value.trim()) {
                  setEntityId("");
                }
              }}
              placeholder="OpCo or Partner name"
            />

            <OrFiltersDivider />

            <FilterToolbar className="mt-4">
              <div className="grid w-full gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                <label className="text-sm">
                  <FieldLabel>Period (month)</FieldLabel>
                  <Select
                    value={month}
                    onChange={(event) => setMonth(Number(event.target.value))}
                  >
                    {MONTHS.slice(0, maxMonth).map((name, index) => (
                      <option key={name} value={index + 1}>
                        {name}
                      </option>
                    ))}
                  </Select>
                </label>
                <label className="text-sm">
                  <FieldLabel>Year</FieldLabel>
                  <Select
                    value={year}
                    onChange={(event) => {
                const nextYear = Number(event.target.value);
                setYear(nextYear);
                const capped = getMaxMonthForYear(nextYear);
                if (month > capped) setMonth(capped);
              }}
                  >
                    {yearOptions.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </Select>
                </label>
                <label className="text-sm">
                  <FieldLabel>Status</FieldLabel>
                  <Select
                    value={laneStatus}
                    onChange={(event) =>
                      setLaneStatus(event.target.value as CompareLaneStatusFilter)
                    }
                  >
                    <option value="all">All</option>
                    <option value="READY">Ready to process</option>
                    <option value="NO_OPCO_REPORT">Waiting for OpCo</option>
                    <option value="NO_PARTNER_REPORT">Waiting for Partner</option>
                    <option value="MISSING">Waiting for both</option>
                    <option value="RECONCILED">Already reconciled</option>
                  </Select>
                </label>
                <label className="text-sm">
                  <FieldLabel>Search by</FieldLabel>
                  <Select
                    value={searchBy}
                    onChange={(event) => {
                      setSearchBy(event.target.value as ReconciliationSearchBy);
                      setEntityId("");
                    }}
                  >
                    <option value="opco">OpCo reports</option>
                    <option value="partner">Partner reports</option>
                  </Select>
                </label>
                <label className="text-sm">
                  <FieldLabel>{searchBy === "opco" ? "OpCo" : "Partner"}</FieldLabel>
                  <Select
                    value={entityId}
                    onChange={(event) => setEntityId(event.target.value)}
                  >
                    <option value="">All</option>
                    {entityOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name}
                      </option>
                    ))}
                  </Select>
                </label>
              </div>
              <div className="flex w-full flex-wrap gap-3">
                <Button onClick={applyCompareFilters}>Apply filters</Button>
                <Button variant="secondary" onClick={clearCompareFilters}>
                  Clear filters
                </Button>
              </div>
            </FilterToolbar>

            <LoadingOverlay active={loading} className="mt-6 min-h-[12rem]" label="Loading pairs…">
              {pagedLanes.total > 0 ? (
                <div className="space-y-4">
                  <DataTableFrame>
                    <DataTable>
                      <DataTableHead>
                        <tr>
                          <SortableDataTableTh
                            label="Period"
                            active={compareSortBy === "period"}
                            direction={compareSortDir}
                            onSort={() => applyCompareSort("period")}
                          />
                          <SortableDataTableTh
                            label="OpCo"
                            active={compareSortBy === "opco"}
                            direction={compareSortDir}
                            onSort={() => applyCompareSort("opco")}
                          />
                          <SortableDataTableTh
                            label="Partner"
                            active={compareSortBy === "partner"}
                            direction={compareSortDir}
                            onSort={() => applyCompareSort("partner")}
                          />
                          <DataTableTh>OpCo report</DataTableTh>
                          <DataTableTh>Partner report</DataTableTh>
                          <DataTableTh>State</DataTableTh>
                          <DataTableTh>Outcome</DataTableTh>
                          <DataTableTh>Actions</DataTableTh>
                        </tr>
                      </DataTableHead>
                      <tbody>
                        {pagedLanes.items.map((lane) => {
                          const key = `${lane.opcoId}-${lane.partnerId}`;
                          const busy = actionId === key || Boolean(reconcilingLabel);
                          return (
                            <DataTableRow key={key}>
                              <DataTableTd className="text-foreground-muted">
                                {formatPeriod(lane.period.month, lane.period.year)}
                              </DataTableTd>
                              <DataTableTd>{lane.opcoName}</DataTableTd>
                              <DataTableTd>{lane.partnerName}</DataTableTd>
                              <DataTableTd className="text-foreground-muted">
                                <ReportFilenameLink
                                  filename={lane.opcoReportFilename}
                                  href={
                                    lane.opcoReportId
                                      ? reportRawFilePreviewUrl(
                                          "dizlee",
                                          lane.opcoReportId as string,
                                        )
                                      : undefined
                                  }
                                />
                              </DataTableTd>
                              <DataTableTd className="text-foreground-muted">
                                <ReportFilenameLink
                                  filename={lane.partnerReportFilename}
                                  href={
                                    lane.partnerReportId
                                      ? reportRawFilePreviewUrl(
                                          "dizlee",
                                          lane.partnerReportId as string,
                                        )
                                      : undefined
                                  }
                                />
                              </DataTableTd>
                              <DataTableTd>
                                <StatusPill tone={stateTone(lane.state)}>
                                  {lane.state.replaceAll("_", " ")}
                                </StatusPill>
                              </DataTableTd>
                              <DataTableTd className="text-foreground-muted">
                                {lane.outcome ?? "—"}
                              </DataTableTd>
                              <DataTableTd>
                                <div className="flex flex-wrap items-center gap-2">
                                  {lane.canRun ? (
                                    <Button
                                      disabled={busy}
                                      onClick={() => void runReconciliation(lane)}
                                      className="h-8 px-3 text-xs"
                                    >
                                      Run reconciliation
                                    </Button>
                                  ) : null}
                                  {needsReportReminder(lane.state) ? (
                                    <IconButton
                                      label={
                                        lane.notificationCount > 0
                                          ? `Remind… · ${lastReminderLabel(lane)} · ${lane.notificationCount} prior notice${lane.notificationCount === 1 ? "" : "s"}`
                                          : `Remind… · ${lastReminderLabel(lane)}`
                                      }
                                      onClick={() => setRemindLane(lane)}
                                    >
                                      <IconBell />
                                    </IconButton>
                                  ) : null}
                                  {lane.reconciliationId ? (
                                    <IconButton
                                      label="View result"
                                      onClick={() =>
                                        openReconciliationResult(
                                          lane.reconciliationId as string,
                                        )
                                      }
                                    >
                                      <IconEye />
                                    </IconButton>
                                  ) : null}
                                </div>
                              </DataTableTd>
                            </DataTableRow>
                          );
                        })}
                      </tbody>
                    </DataTable>
                  </DataTableFrame>

                  <ListPagination
                    total={pagedLanes.total}
                    page={pagedLanes.page}
                    totalPages={pagedLanes.totalPages}
                    noun="pair"
                    onPageChange={setLanePage}
                    loading={loading}
                  />
                </div>
              ) : (
                <EmptyState
                  title="No pairs found"
                  description="Adjust period, status, or search filters to see linked OpCo–Partner pairs."
                />
              )}
            </LoadingOverlay>
          </>
        ) : (
          <>
            <ListSearch
              className="mt-6"
              value={historySearch}
              onChange={setHistorySearch}
              placeholder="OpCo, Partner, status, or run by"
            />

            <div className="mt-4 flex gap-3">
              <Button variant="secondary" onClick={clearHistoryFilters}>
                Clear filters
              </Button>
            </div>

            <LoadingOverlay active={loading} className="mt-6 min-h-[12rem]" label="Loading history…">
            {history.items.length > 0 ? (
              <div className="space-y-4">
                <DataTableFrame>
                  <DataTable>
                    <DataTableHead>
                      <tr>
                        <SortableDataTableTh
                          label="Period"
                          active={historySortBy === "period"}
                          direction={historySortDir}
                          onSort={() => applyHistorySort("period")}
                        />
                        <SortableDataTableTh
                          label="OpCo"
                          active={historySortBy === "opco"}
                          direction={historySortDir}
                          onSort={() => applyHistorySort("opco")}
                        />
                        <SortableDataTableTh
                          label="Partner"
                          active={historySortBy === "partner"}
                          direction={historySortDir}
                          onSort={() => applyHistorySort("partner")}
                        />
                        <DataTableTh>Status</DataTableTh>
                        <DataTableTh>Matched</DataTableTh>
                        <DataTableTh>Unmatched</DataTableTh>
                        <SortableDataTableTh
                          label="Run at"
                          active={historySortBy === "runAt"}
                          direction={historySortDir}
                          onSort={() => applyHistorySort("runAt")}
                        />
                        <DataTableTh>Action</DataTableTh>
                      </tr>
                    </DataTableHead>
                    <tbody>
                      {history.items.map((row) => (
                        <DataTableRow key={row.id}>
                          <DataTableTd className="text-foreground-muted">
                            {formatPeriod(row.period.month, row.period.year)}
                          </DataTableTd>
                          <DataTableTd>{row.opcoName}</DataTableTd>
                          <DataTableTd>{row.partnerName}</DataTableTd>
                          <DataTableTd className="text-foreground-muted">
                            {row.status}
                          </DataTableTd>
                          <DataTableTd className="text-foreground-muted">
                            {row.matchedCount}
                          </DataTableTd>
                          <DataTableTd className="text-foreground-muted">
                            {row.unmatchedCount}
                          </DataTableTd>
                          <DataTableTd className="text-foreground-muted">
                            {formatDateTime(row.runAt)}
                          </DataTableTd>
                          <DataTableTd>
                            <IconButton
                              label="View result"
                              onClick={() => openReconciliationResult(row.id)}
                            >
                              <IconEye />
                            </IconButton>
                          </DataTableTd>
                        </DataTableRow>
                      ))}
                    </tbody>
                  </DataTable>
                </DataTableFrame>
                <ListPagination
                  total={history.totalCount}
                  page={history.page}
                  totalPages={history.totalPages}
                  noun="record"
                  onPageChange={(page) => void loadHistory(page)}
                  loading={loading}
                />
              </div>
            ) : (
              <EmptyState
                title="No reconciliation history"
                description="Run reconciliation on a ready pair to see results here."
              />
            )}
            </LoadingOverlay>
          </>
        )}
      </PageCard>

      {remindLane ? (
        <LaneRemindModal
          lane={remindLane}
          month={month}
          year={year}
          onClose={() => setRemindLane(null)}
          onSent={(sentMessage) => {
            toast.success(sentMessage);
            void loadLanes({
              month,
              year,
              searchBy,
              entityId: debouncedLaneSearch.trim()
                ? undefined
                : entityId || undefined,
              search: debouncedLaneSearch.trim() || undefined,
              status: laneStatus,
              sortBy: compareSortBy,
              sortDir: compareSortDir,
            });
          }}
        />
      ) : null}

      <SuccessDialog
        open={runSuccess !== null}
        title="Reconciliation complete"
        message={
          runSuccess?.message ?? "Reconciliation completed successfully."
        }
        actionLabel="View result"
        onAction={() => {
          const id = runSuccess?.id;
          setRunSuccess(null);
          if (id != null) {
            openReconciliationResult(id);
          }
        }}
      />
    </div>
  );
}

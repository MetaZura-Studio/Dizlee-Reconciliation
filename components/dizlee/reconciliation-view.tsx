"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { ReportDetailModal } from "@/components/dizlee/report-detail-modal";
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
} from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { FieldLabel, Select } from "@/components/ui/field";
import { IconButton } from "@/components/ui/icon-button";
import { IconBell, IconEye } from "@/components/ui/icons";
import { FilterToolbar, PageCard, PageHeader } from "@/components/ui/page";
import { StatusPill } from "@/components/ui/status-pill";
import { ListSearch, OrFiltersDivider } from "@/components/ui/list-search";
import type { ReportDetail, ReportFilterOptions } from "@/lib/dizlee/reports";
import type {
  CompareLaneFilters,
  CompareLaneRow,
  ReconciliationHistoryResult,
  ReconciliationSearchBy,
} from "@/lib/dizlee/reconciliation";
import { ui } from "@/lib/ui/classes";
import { useDebouncedValue } from "@/lib/ui/use-debounced-value";

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
  const [laneSearch, setLaneSearch] = useState(initialCompareFilters.search ?? "");
  const debouncedLaneSearch = useDebouncedValue(laneSearch, 300);
  const [historySearch, setHistorySearch] = useState("");
  const debouncedHistorySearch = useDebouncedValue(historySearch, 300);
  const skipLaneSearchEffect = useRef(true);
  const skipHistorySearchEffect = useRef(true);

  const [lanes, setLanes] = useState(initialLanes);
  const [filterOptions, setFilterOptions] =
    useState<ReportFilterOptions>(initialFilterOptions);
  const [tolerancePercent, setTolerancePercent] = useState(
    initialTolerancePercent,
  );
  const [history, setHistory] = useState(initialHistory);

  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [reportDetailOpen, setReportDetailOpen] = useState(false);
  const [reportDetailLoading, setReportDetailLoading] = useState(false);
  const [reportDetail, setReportDetail] = useState<ReportDetail | null>(null);
  const [remindLane, setRemindLane] = useState<CompareLaneRow | null>(null);
  const [reconcilingLabel, setReconcilingLabel] = useState<string | null>(null);

  const openReportDetail = async (reportId: string) => {
    setReportDetailOpen(true);
    setReportDetailLoading(true);
    setReportDetail(null);
    try {
      const response = await fetch(`/api/dizlee/reports/${reportId}`);
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to load report");
      }
      setReportDetail(payload.data as ReportDetail);
    } catch (detailError) {
      setError(
        detailError instanceof Error
          ? detailError.message
          : "Failed to load report",
      );
      setReportDetailOpen(false);
    } finally {
      setReportDetailLoading(false);
    }
  };

  const loadLanes = useCallback(async (filters: CompareLaneFilters) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/dizlee/reconciliation/lanes?${buildLaneQuery(filters)}`,
      );
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to load lanes");
      }
      setLanes(payload.data as CompareLaneRow[]);
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

  const loadHistory = useCallback(async (page = 1, search = debouncedHistorySearch) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page) });
      const term = search.trim();
      if (term) {
        params.set("search", term);
      }
      const response = await fetch(`/api/dizlee/reconciliation/history?${params}`);
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to load history");
      }
      setHistory(payload.data as ReconciliationHistoryResult);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Failed to load history",
      );
    } finally {
      setLoading(false);
    }
  }, [debouncedHistorySearch]);

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
    });
  };

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
      });
    }, 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- live search only
  }, [debouncedLaneSearch, loadLanes, activeTab]);

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
    setMessage(null);
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
        throw new Error(payload.error ?? "Failed to run reconciliation");
      }
      setMessage(payload.data.message as string);
      await loadLanes({
        month,
        year,
        searchBy,
        entityId: debouncedLaneSearch.trim() ? undefined : entityId || undefined,
        search: debouncedLaneSearch.trim() || undefined,
      });
      openReconciliationResult(payload.data.id as number);
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
        });
      } else {
        void loadHistory(history.page);
      }
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [
    activeTab,
    debouncedLaneSearch,
    entityId,
    history.page,
    loadHistory,
    loadLanes,
    month,
    searchBy,
    year,
  ]);

  const yearOptions = [];
  for (let value = year + 1; value >= year - 4; value -= 1) {
    yearOptions.push(value);
  }

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

        {message ? <p className={`mt-6 ${ui.alertSuccess}`}>{message}</p> : null}
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
              <div className="grid w-full gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <label className="text-sm">
                  <FieldLabel>Period (month)</FieldLabel>
                  <Select
                    value={month}
                    onChange={(event) => setMonth(Number(event.target.value))}
                  >
                    {MONTHS.map((name, index) => (
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
                    onChange={(event) => setYear(Number(event.target.value))}
                  >
                    {yearOptions.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
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
              <Button onClick={applyCompareFilters}>Apply filters</Button>
            </FilterToolbar>

            {loading ? (
              <p className="mt-4 text-sm text-foreground-subtle">Loading pairs…</p>
            ) : null}

            {!loading ? (
              lanes.length > 0 ? (
                <div className="mt-6">
                  <DataTableFrame>
                    <DataTable>
                      <DataTableHead>
                        <tr>
                          <DataTableTh>Period</DataTableTh>
                          <DataTableTh>OpCo</DataTableTh>
                          <DataTableTh>Partner</DataTableTh>
                          <DataTableTh>OpCo report</DataTableTh>
                          <DataTableTh>Partner report</DataTableTh>
                          <DataTableTh>State</DataTableTh>
                          <DataTableTh>Outcome</DataTableTh>
                          <DataTableTh>Actions</DataTableTh>
                        </tr>
                      </DataTableHead>
                      <tbody>
                        {lanes.map((lane) => {
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
                                  onClick={
                                    lane.opcoReportId
                                      ? () =>
                                          void openReportDetail(lane.opcoReportId as string)
                                      : undefined
                                  }
                                />
                              </DataTableTd>
                              <DataTableTd className="text-foreground-muted">
                                <ReportFilenameLink
                                  filename={lane.partnerReportFilename}
                                  onClick={
                                    lane.partnerReportId
                                      ? () =>
                                          void openReportDetail(
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
                </div>
              ) : (
                <EmptyState
                  className="mt-6"
                  title="No pairs found"
                  description="Adjust period or search filters to see linked OpCo–Partner pairs."
                />
              )
            ) : null}
          </>
        ) : (
          <>
            <ListSearch
              className="mt-6"
              value={historySearch}
              onChange={setHistorySearch}
              placeholder="OpCo, Partner, status, or run by"
            />

            {loading ? (
              <p className="mt-6 text-sm text-foreground-subtle">Loading history…</p>
            ) : null}
            {!loading && history.items.length > 0 ? (
              <div className="mt-6 space-y-4">
                <DataTableFrame>
                  <DataTable>
                    <DataTableHead>
                      <tr>
                        <DataTableTh>Period</DataTableTh>
                        <DataTableTh>OpCo / Partner</DataTableTh>
                        <DataTableTh>Status</DataTableTh>
                        <DataTableTh>Matched</DataTableTh>
                        <DataTableTh>Unmatched</DataTableTh>
                        <DataTableTh>Run at</DataTableTh>
                        <DataTableTh>Action</DataTableTh>
                      </tr>
                    </DataTableHead>
                    <tbody>
                      {history.items.map((row) => (
                        <DataTableRow key={row.id}>
                          <DataTableTd className="text-foreground-muted">
                            {formatPeriod(row.period.month, row.period.year)}
                          </DataTableTd>
                          <DataTableTd>{row.lane}</DataTableTd>
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
                <div className="flex items-center justify-between text-sm text-foreground-muted">
                  <p>
                    Page {history.page} / {history.totalPages} · Total{" "}
                    {history.totalCount} records
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      disabled={history.page <= 1}
                      onClick={() => void loadHistory(history.page - 1)}
                    >
                      Prev
                    </Button>
                    <Button
                      variant="secondary"
                      disabled={history.page >= history.totalPages}
                      onClick={() => void loadHistory(history.page + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </div>
            ) : !loading ? (
              <EmptyState
                className="mt-6"
                title="No reconciliation history"
                description="Run reconciliation on a ready pair to see results here."
              />
            ) : null}
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
            setMessage(sentMessage);
            void loadLanes({
              month,
              year,
              searchBy,
              entityId: debouncedLaneSearch.trim()
                ? undefined
                : entityId || undefined,
              search: debouncedLaneSearch.trim() || undefined,
            });
          }}
        />
      ) : null}

      {reportDetailOpen ? (
        <ReportDetailModal
          detail={reportDetail}
          loading={reportDetailLoading}
          onClose={() => {
            setReportDetailOpen(false);
            setReportDetail(null);
          }}
        />
      ) : null}
    </div>
  );
}

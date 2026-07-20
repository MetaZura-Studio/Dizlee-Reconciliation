"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { FieldLegend } from "@/components/ui/field";
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
import { IconDownload, IconEye } from "@/components/ui/icons";
import { ListSearch, OrFiltersDivider } from "@/components/ui/list-search";
import { FilterToolbar, PageCard, PageHeader } from "@/components/ui/page";
import { StatusPill } from "@/components/ui/status-pill";
import { cn, ui } from "@/lib/ui/classes";
import { nextSortState } from "@/lib/ui/sort";
import { useDebouncedValue } from "@/lib/ui/use-debounced-value";
import type {
  ConsolidationHistoryResult,
  ConsolidationHistorySortField,
  ConsolidationReadiness,
  SortDirection,
} from "@/lib/dizlee/consolidation";
import type { ReportFilterOptions } from "@/lib/dizlee/reports";
import {
  getMaxMonthForYear,
  getPeriodYearOptions,
} from "@/lib/platform/period";

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

function formatUsd(value: number | null): string {
  if (value === null) {
    return "—";
  }
  return new Intl.NumberFormat("en-KW", {
    style: "currency",
    currency: "KWD",
    maximumFractionDigits: 3,
  }).format(value);
}

function buildReadinessQuery(month: number, year: number, opcoId: string): string {
  return new URLSearchParams({
    month: String(month),
    year: String(year),
    opcoId,
  }).toString();
}

type ConsolidationViewProps = {
  initialTab: "generate" | "history";
  initialMonth: number;
  initialYear: number;
  initialOpcoId: string;
  initialFilterOptions: ReportFilterOptions;
  initialReadiness: ConsolidationReadiness | null;
  initialHistory: ConsolidationHistoryResult;
};

export function ConsolidationView({
  initialTab,
  initialMonth,
  initialYear,
  initialOpcoId,
  initialFilterOptions,
  initialReadiness,
  initialHistory,
}: ConsolidationViewProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"generate" | "history">(initialTab);
  const [month, setMonth] = useState(initialMonth);
  const [year, setYear] = useState(initialYear);
  const [opcoId, setOpcoId] = useState(initialOpcoId);
  const [historySearch, setHistorySearch] = useState("");
  const debouncedHistorySearch = useDebouncedValue(historySearch, 300);
  const skipHistorySearchEffect = useRef(true);
  const [historySortBy, setHistorySortBy] = useState<ConsolidationHistorySortField>(
    initialHistory.sortBy ?? "generated",
  );
  const [historySortDir, setHistorySortDir] = useState<SortDirection>(
    initialHistory.sortDir ?? "desc",
  );

  const [filterOptions, setFilterOptions] =
    useState<ReportFilterOptions>(initialFilterOptions);
  const [readiness, setReadiness] = useState<ConsolidationReadiness | null>(
    initialReadiness,
  );
  const [history, setHistory] = useState(initialHistory);
  const [appliedHistoryFilters, setAppliedHistoryFilters] = useState<{
    month?: number;
    year?: number;
    opcoId?: string;
  }>({});

  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const openConsolidationResult = (id: number | string) => {
    router.push(`/dizlee/consolidation/${id}`);
  };

  const loadReadiness = useCallback(
    async (nextMonth: number, nextYear: number, nextOpcoId: string) => {
      if (!nextOpcoId) {
        setReadiness(null);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/dizlee/consolidation/readiness?${buildReadinessQuery(nextMonth, nextYear, nextOpcoId)}`,
        );
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error ?? "Failed to load readiness");
        }
        setReadiness(payload.data as ConsolidationReadiness);
        if (payload.filterOptions) {
          setFilterOptions(payload.filterOptions as ReportFilterOptions);
        }
      } catch (loadError) {
        setError(
          loadError instanceof Error ? loadError.message : "Failed to load readiness",
        );
        setReadiness(null);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const loadHistory = useCallback(
    async (
      page = 1,
      filters: { month?: number; year?: number; opcoId?: string } = appliedHistoryFilters,
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
        if (filters.month) {
          params.set("month", String(filters.month));
        }
        if (filters.year) {
          params.set("year", String(filters.year));
        }
        const term = search.trim();
        if (term) {
          params.set("search", term);
        } else if (filters.opcoId) {
          params.set("opcoId", filters.opcoId);
        }

        const response = await fetch(`/api/dizlee/consolidation/history?${params}`);
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error ?? "Failed to load history");
        }
        const data = payload.data as ConsolidationHistoryResult;
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
    },
    [appliedHistoryFilters, debouncedHistorySearch, historySortBy, historySortDir],
  );

  const applyHistorySort = (field: ConsolidationHistorySortField) => {
    const next = nextSortState(historySortBy, historySortDir, field);
    setHistorySortBy(next.sortBy);
    setHistorySortDir(next.sortDir);
    void loadHistory(
      1,
      appliedHistoryFilters,
      debouncedHistorySearch,
      next.sortBy,
      next.sortDir,
    );
  };

  const applyHistoryFilters = () => {
    if (historySearch) {
      skipHistorySearchEffect.current = true;
      setHistorySearch("");
    }
    const next = {
      month,
      year,
      opcoId: opcoId || undefined,
    };
    setAppliedHistoryFilters(next);
    void loadHistory(1, next, "");
  };

  useEffect(() => {
    if (skipHistorySearchEffect.current) {
      skipHistorySearchEffect.current = false;
      return;
    }
    if (activeTab !== "history") {
      return;
    }
    const term = debouncedHistorySearch.trim();
    const timer = window.setTimeout(() => {
      void loadHistory(1, appliedHistoryFilters, term);
    }, 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- live search only
  }, [debouncedHistorySearch, activeTab]);

  const applyGenerateFilters = () => {
    void loadReadiness(month, year, opcoId);
  };

  const runGenerate = async () => {
    if (!opcoId) {
      setError("Select an OpCo first.");
      return;
    }

    setGenerating(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/dizlee/consolidation/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, year, opcoId }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to generate consolidation");
      }

      openConsolidationResult(payload.data.id as number);
    } catch (generateError) {
      setError(
        generateError instanceof Error
          ? generateError.message
          : "Failed to generate consolidation",
      );
    } finally {
      setGenerating(false);
    }
  };

  const downloadExcel = (id: number) => {
    window.location.href = `/api/dizlee/consolidation/${id}/export`;
  };

  useEffect(() => {
    const handleFocus = () => {
      if (activeTab === "generate" && opcoId) {
        void loadReadiness(month, year, opcoId);
      } else if (activeTab === "history") {
        void loadHistory(history.page);
      }
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [activeTab, history.page, loadHistory, loadReadiness, month, opcoId, year]);

  const yearOptions = getPeriodYearOptions();
  const maxMonth = getMaxMonthForYear(year);

  const canGenerate = Boolean(readiness?.ready && opcoId);
  const isRegenerate = Boolean(readiness?.existingConsolidationId);

  return (
    <PageCard>
      <PageHeader
        title="Consolidation"
        description="Generate OpCo monthly consolidations from uploaded OpCo reports and export Excel."
      />

      <div className="border-b border-border">
        <nav className="-mb-px flex gap-6">
          {[
            { id: "generate" as const, label: "Generate" },
            { id: "history" as const, label: "History" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id);
                if (tab.id === "history") {
                  setError(null);
                  setAppliedHistoryFilters({});
                  skipHistorySearchEffect.current = true;
                  setHistorySearch("");
                  void loadHistory(1, {}, "");
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

      {error ? <div className={cn("mt-4", ui.alertError)}>{error}</div> : null}

      {message ? <div className={cn("mt-4", ui.alertSuccess)}>{message}</div> : null}

      {activeTab === "generate" ? (
        <div className="mt-6 space-y-6">
          <FilterToolbar>
            <div className="grid w-full gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <label className="text-sm">
                <FieldLegend required>Month</FieldLegend>
                <select
                  value={month}
                  onChange={(event) => setMonth(Number(event.target.value))}
                  className={ui.select}
                >
                  {MONTHS.slice(0, maxMonth).map((label, index) => (
                    <option key={label} value={index + 1}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm">
                <FieldLegend required>Year</FieldLegend>
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

              <label className="text-sm sm:col-span-2">
                <FieldLegend required>OpCo</FieldLegend>
                <select
                  value={opcoId}
                  onChange={(event) => setOpcoId(event.target.value)}
                  className={ui.select}
                >
                  <option value="">Select OpCo</option>
                  {filterOptions.opcos.map((opco) => (
                    <option key={opco.id} value={opco.id}>
                      {opco.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="flex w-full flex-wrap gap-3">
              <Button onClick={applyGenerateFilters} disabled={!opcoId || loading}>
                Check readiness
              </Button>
              <Button
                variant="secondary"
                onClick={() => void runGenerate()}
                disabled={!canGenerate || generating}
              >
                {generating
                  ? "Working…"
                  : isRegenerate
                    ? "Regenerate consolidation"
                    : "Generate consolidation"}
              </Button>
            </div>
          </FilterToolbar>

          {readiness ? (
            <div className={ui.cardPaddingLg}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-medium text-foreground">
                    {readiness.opcoName} — {readiness.period.label}
                  </h2>
                  <p className="mt-1 text-sm text-foreground-subtle">
                    {readiness.linkedCount} linked partner
                    {readiness.linkedCount === 1 ? "" : "s"}
                    {readiness.existingConsolidationId
                      ? " · Existing consolidation will be replaced on regenerate"
                      : ""}
                  </p>
                </div>
                <StatusPill tone={readiness.ready ? "success" : "warning"}>
                  {readiness.ready ? "Ready to generate" : "Not ready"}
                </StatusPill>
              </div>

              {readiness.missingPartners.length > 0 ? (
                <div className={cn("mt-3", ui.alertWarning)}>
                  Missing OpCo reports for: {readiness.missingPartners.join(", ")}
                </div>
              ) : null}

              {readiness.linkedCount > 0 ? (
                <DataTableFrame className="mt-4">
                  <DataTable>
                    <DataTableHead>
                      <tr>
                        <DataTableTh>Partner</DataTableTh>
                        <DataTableTh>OpCo report</DataTableTh>
                      </tr>
                    </DataTableHead>
                    <tbody>
                      {readiness.partners.map((partner) => {
                        const submitted =
                          partner.hasReport && partner.lineItemCount > 0;
                        return (
                          <DataTableRow key={partner.partnerId}>
                            <DataTableTd>{partner.partnerName}</DataTableTd>
                            <DataTableTd>
                              <StatusPill tone={submitted ? "success" : "warning"}>
                                {submitted ? "Submitted" : "Missing"}
                              </StatusPill>
                            </DataTableTd>
                          </DataTableRow>
                        );
                      })}
                    </tbody>
                  </DataTable>
                </DataTableFrame>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          <ListSearch
            className="mt-0"
            value={historySearch}
            onChange={(value) => {
              setHistorySearch(value);
            }}
            placeholder="OpCo, status, or run by"
          />

          <OrFiltersDivider className="mt-0" />

          <FilterToolbar>
            <div className="grid w-full gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <label className="text-sm">
                <span className={ui.label}>Month</span>
                <select
                  value={month}
                  onChange={(event) => setMonth(Number(event.target.value))}
                  className={ui.select}
                >
                  {MONTHS.slice(0, maxMonth).map((label, index) => (
                    <option key={label} value={index + 1}>
                      {label}
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

              <label className="text-sm sm:col-span-2">
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
            </div>

            <Button onClick={applyHistoryFilters} disabled={loading}>
              Apply filters
            </Button>
          </FilterToolbar>

          {history.items.length === 0 ? (
            <EmptyState
              title="No consolidations found"
              description="No consolidations found for the selected filters."
            />
          ) : (
            <>
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
                      <DataTableTh>Status</DataTableTh>
                      <SortableDataTableTh
                        label="Total KWD"
                        active={historySortBy === "total"}
                        direction={historySortDir}
                        onSort={() => applyHistorySort("total")}
                        align="right"
                      />
                      <SortableDataTableTh
                        label="Items"
                        active={historySortBy === "items"}
                        direction={historySortDir}
                        onSort={() => applyHistorySort("items")}
                        align="right"
                      />
                      <SortableDataTableTh
                        label="Generated"
                        active={historySortBy === "generated"}
                        direction={historySortDir}
                        onSort={() => applyHistorySort("generated")}
                      />
                      <DataTableTh>Actions</DataTableTh>
                    </tr>
                  </DataTableHead>
                  <tbody>
                    {history.items.map((item) => (
                      <DataTableRow key={item.id}>
                        <DataTableTd>{formatPeriod(item.period.month, item.period.year)}</DataTableTd>
                        <DataTableTd>{item.opcoName}</DataTableTd>
                        <DataTableTd className="text-foreground-muted">{item.status}</DataTableTd>
                        <DataTableTd align="right" className="text-foreground-muted">
                          {formatUsd(item.totalAmountUsd)}
                        </DataTableTd>
                        <DataTableTd align="right" className="text-foreground-muted">
                          {item.itemCount}
                        </DataTableTd>
                        <DataTableTd className="text-foreground-muted">
                          <div>{formatDateTime(item.generatedAt)}</div>
                          <div className="text-xs text-foreground-subtle">by {item.runBy}</div>
                        </DataTableTd>
                        <DataTableTd>
                          <div className="flex flex-wrap items-center gap-2">
                            <IconButton
                              label="View consolidation"
                              onClick={() => openConsolidationResult(item.id)}
                            >
                              <IconEye />
                            </IconButton>
                            <IconButton
                              label="Download Excel"
                              onClick={() => downloadExcel(item.id)}
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

              {history.totalPages > 1 ? (
                <div className="flex items-center justify-between text-sm text-foreground-muted">
                  <span>
                    Page {history.page} of {history.totalPages}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      disabled={history.page <= 1 || loading}
                      onClick={() => void loadHistory(history.page - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="secondary"
                      disabled={history.page >= history.totalPages || loading}
                      onClick={() => void loadHistory(history.page + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>
      )}
    </PageCard>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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
import { IconButton } from "@/components/ui/icon-button";
import { IconEye } from "@/components/ui/icons";
import { ListSearch, OrFiltersDivider } from "@/components/ui/list-search";
import { FilterToolbar, PageCard, PageHeader } from "@/components/ui/page";
import { StatusPill } from "@/components/ui/status-pill";
import { cn, ui } from "@/lib/ui/classes";
import { useDebouncedValue } from "@/lib/ui/use-debounced-value";
import type {
  ConsolidationDetail,
  ConsolidationHistoryResult,
  ConsolidationReadiness,
} from "@/lib/dizlee/consolidation";
import type { ReportFilterOptions } from "@/lib/dizlee/reports";

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
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 4,
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
  initialDetail: ConsolidationDetail | null;
};

export function ConsolidationView({
  initialTab,
  initialMonth,
  initialYear,
  initialOpcoId,
  initialFilterOptions,
  initialReadiness,
  initialHistory,
  initialDetail,
}: ConsolidationViewProps) {
  const [activeTab, setActiveTab] = useState<"generate" | "history">(initialTab);
  const [month, setMonth] = useState(initialMonth);
  const [year, setYear] = useState(initialYear);
  const [opcoId, setOpcoId] = useState(initialOpcoId);
  const [historySearch, setHistorySearch] = useState("");
  const debouncedHistorySearch = useDebouncedValue(historySearch, 300);
  const skipHistorySearchEffect = useRef(true);

  const [filterOptions, setFilterOptions] =
    useState<ReportFilterOptions>(initialFilterOptions);
  const [readiness, setReadiness] = useState<ConsolidationReadiness | null>(
    initialReadiness,
  );
  const [history, setHistory] = useState(initialHistory);
  const [detail, setDetail] = useState<ConsolidationDetail | null>(initialDetail);

  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

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
      historyMonth = month,
      historyYear = year,
      historyOpcoId = opcoId,
      search = debouncedHistorySearch,
    ) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ page: String(page) });
        if (historyMonth) {
          params.set("month", String(historyMonth));
        }
        if (historyYear) {
          params.set("year", String(historyYear));
        }
        const term = search.trim();
        if (term) {
          params.set("search", term);
        } else if (historyOpcoId) {
          params.set("opcoId", historyOpcoId);
        }

        const response = await fetch(`/api/dizlee/consolidation/history?${params}`);
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error ?? "Failed to load history");
        }
        setHistory(payload.data as ConsolidationHistoryResult);
      } catch (loadError) {
        setError(
          loadError instanceof Error ? loadError.message : "Failed to load history",
        );
      } finally {
        setLoading(false);
      }
    },
    [debouncedHistorySearch, month, opcoId, year],
  );

  const applyHistoryFilters = () => {
    if (historySearch) {
      skipHistorySearchEffect.current = true;
      setHistorySearch("");
    }
    void loadHistory(1, month, year, opcoId, "");
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
      void loadHistory(1, month, year, term ? "" : opcoId, term);
    }, 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- live search only
  }, [debouncedHistorySearch, activeTab, loadHistory]);

  const loadDetail = useCallback(async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/dizlee/consolidation/${id}`);
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to load consolidation");
      }
      setDetail(payload.data as ConsolidationDetail);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Failed to load consolidation",
      );
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, []);

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

      setMessage(payload.data.message as string);
      await Promise.all([
        loadReadiness(month, year, opcoId),
        loadDetail(payload.data.id as number),
        loadHistory(1),
      ]);
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

  const yearOptions = [];
  for (let value = year + 1; value >= year - 4; value -= 1) {
    yearOptions.push(value);
  }

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

      {error ? <div className={cn("mt-4", ui.alertError)}>{error}</div> : null}

      {message ? <div className={cn("mt-4", ui.alertSuccess)}>{message}</div> : null}

      {activeTab === "generate" ? (
        <div className="mt-6 space-y-6">
          <FilterToolbar>
            <div className="grid w-full gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <label className="text-sm">
                <span className={ui.label}>Month</span>
                <select
                  value={month}
                  onChange={(event) => setMonth(Number(event.target.value))}
                  className={ui.select}
                >
                  {MONTHS.map((label, index) => (
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

              <label className="text-sm sm:col-span-2">
                <span className={ui.label}>OpCo</span>
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
                  Missing OpCo reports or line items for:{" "}
                  {readiness.missingPartners.join(", ")}
                </div>
              ) : null}

              <DataTableFrame className="mt-4">
                <DataTable>
                  <DataTableHead>
                    <tr>
                      <DataTableTh>Partner</DataTableTh>
                      <DataTableTh>OpCo report</DataTableTh>
                      <DataTableTh>Line items</DataTableTh>
                    </tr>
                  </DataTableHead>
                  <tbody>
                    {readiness.partners.map((partner) => (
                      <DataTableRow key={partner.partnerId}>
                        <DataTableTd>{partner.partnerName}</DataTableTd>
                        <DataTableTd>
                          <StatusPill tone={partner.hasReport ? "success" : "warning"}>
                            {partner.hasReport ? "Uploaded" : "Missing"}
                          </StatusPill>
                        </DataTableTd>
                        <DataTableTd className="text-foreground-muted">
                          {partner.lineItemCount}
                        </DataTableTd>
                      </DataTableRow>
                    ))}
                  </tbody>
                </DataTable>
              </DataTableFrame>
            </div>
          ) : null}

          {detail ? (
            <div className={ui.cardPaddingLg}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-medium text-foreground">
                    Latest detail — {detail.opcoName}
                  </h2>
                  <p className="mt-1 text-sm text-foreground-subtle">
                    Generated {formatDateTime(detail.generatedAt)} by {detail.runBy}
                  </p>
                </div>
                <Button variant="secondary" onClick={() => downloadExcel(detail.id)}>
                  Download Excel
                </Button>
              </div>

              <p className="mt-3 text-sm text-foreground-muted">
                Total USD: {formatUsd(detail.totalAmountUsd)}
              </p>

              <DataTableFrame className="mt-4 max-h-80 overflow-auto">
                <DataTable>
                  <DataTableHead className="sticky top-0 z-10">
                    <tr>
                      <DataTableTh>Partner</DataTableTh>
                      <DataTableTh>Service</DataTableTh>
                      <DataTableTh>Description</DataTableTh>
                      <DataTableTh align="right">Usage</DataTableTh>
                      <DataTableTh align="right">USD</DataTableTh>
                    </tr>
                  </DataTableHead>
                  <tbody>
                    {detail.items.map((item, index) => (
                      <DataTableRow
                        key={`${item.partnerName}-${item.serviceCode}-${index}`}
                      >
                        <DataTableTd>{item.partnerName}</DataTableTd>
                        <DataTableTd className="text-foreground-muted">
                          {item.serviceCode ?? "—"}
                        </DataTableTd>
                        <DataTableTd className="text-foreground-muted">
                          {item.description}
                        </DataTableTd>
                        <DataTableTd align="right" className="text-foreground-muted">
                          {formatNumber(item.usageAmount)}
                          {item.usageUnit ? ` ${item.usageUnit}` : ""}
                        </DataTableTd>
                        <DataTableTd align="right" className="text-foreground-muted">
                          {formatUsd(item.usageUsd)}
                        </DataTableTd>
                      </DataTableRow>
                    ))}
                  </tbody>
                </DataTable>
              </DataTableFrame>
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
              if (value.trim()) {
                setOpcoId("");
              }
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
                  {MONTHS.map((label, index) => (
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
                      <DataTableTh>Period</DataTableTh>
                      <DataTableTh>OpCo</DataTableTh>
                      <DataTableTh>Status</DataTableTh>
                      <DataTableTh align="right">Total USD</DataTableTh>
                      <DataTableTh align="right">Items</DataTableTh>
                      <DataTableTh>Generated</DataTableTh>
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
                              onClick={() => void loadDetail(item.id)}
                            >
                              <IconEye />
                            </IconButton>
                            <Button
                              variant="secondary"
                              onClick={() => downloadExcel(item.id)}
                            >
                              Excel
                            </Button>
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

          {detail ? (
            <div className={ui.cardPaddingLg}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-medium text-foreground">
                    {detail.opcoName} — {detail.period.label}
                  </h2>
                  <p className="mt-1 text-sm text-foreground-subtle">
                    {detail.status} · Generated {formatDateTime(detail.generatedAt)}
                  </p>
                </div>
                <Button variant="secondary" onClick={() => downloadExcel(detail.id)}>
                  Download Excel
                </Button>
              </div>

              <p className="mt-3 text-sm text-foreground-muted">
                Total USD: {formatUsd(detail.totalAmountUsd)}
              </p>

              <DataTableFrame className="mt-4 max-h-96 overflow-auto">
                <DataTable>
                  <DataTableHead className="sticky top-0 z-10">
                    <tr>
                      <DataTableTh>Partner</DataTableTh>
                      <DataTableTh>Service</DataTableTh>
                      <DataTableTh>Description</DataTableTh>
                      <DataTableTh align="right">Usage</DataTableTh>
                      <DataTableTh align="right">USD</DataTableTh>
                    </tr>
                  </DataTableHead>
                  <tbody>
                    {detail.items.map((item, index) => (
                      <DataTableRow
                        key={`${item.partnerName}-${item.serviceCode}-${index}`}
                      >
                        <DataTableTd>{item.partnerName}</DataTableTd>
                        <DataTableTd className="text-foreground-muted">
                          {item.serviceCode ?? "—"}
                        </DataTableTd>
                        <DataTableTd className="text-foreground-muted">
                          {item.description}
                        </DataTableTd>
                        <DataTableTd align="right" className="text-foreground-muted">
                          {formatNumber(item.usageAmount)}
                          {item.usageUnit ? ` ${item.usageUnit}` : ""}
                        </DataTableTd>
                        <DataTableTd align="right" className="text-foreground-muted">
                          {formatUsd(item.usageUsd)}
                        </DataTableTd>
                      </DataTableRow>
                    ))}
                  </tbody>
                </DataTable>
              </DataTableFrame>
            </div>
          ) : null}
        </div>
      )}
    </PageCard>
  );
}

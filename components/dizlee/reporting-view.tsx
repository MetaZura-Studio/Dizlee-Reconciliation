/**
 * Analytic reporting across OpCo–partner pairs with filters and export-oriented tables.
 * Supports operational analysis beyond raw submission lists.
 */

"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";

import { KpiCard } from "@/components/dizlee/kpi-card";
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
import { ListSearch } from "@/components/ui/list-search";
import { ListPagination } from "@/components/ui/list-pagination";
import { FilterToolbar, PageCard, PageHeader } from "@/components/ui/page";
import { StatusPill } from "@/components/ui/status-pill";
import { LoadingOverlay } from "@/components/ui/loading";
import { cn, ui } from "@/lib/ui/classes";
import { paginateItems } from "@/lib/ui/list-pagination";
import { nextSortState, type SortDirection } from "@/lib/ui/sort";
import { useDebouncedValue } from "@/lib/ui/use-debounced-value";
import type { ReportFilterOptions } from "@/lib/dizlee/reports";
import {
  getCurrentPeriod,
  getMaxMonthForYear,
  getPeriodYearOptions,
} from "@/lib/platform/period";
import type {
  ReportingLaneRow,
  ReportingLaneStatus,
  ReportingOverview,
} from "@/lib/dizlee/reporting";
import { formatAppError } from "@/lib/errors/format";
import { formatUsd } from "@/lib/platform/format-money";

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

type StatusFilter = "all" | ReportingLaneStatus;
type LaneSortField = "lane" | "overall" | "reconciliation";

function compareLanes(
  a: ReportingLaneRow,
  b: ReportingLaneRow,
  sortBy: LaneSortField,
  sortDir: SortDirection,
): number {
  const dir = sortDir === "asc" ? 1 : -1;
  if (sortBy === "overall") {
    const byStatus = a.overallStatus.localeCompare(b.overallStatus) * dir;
    if (byStatus !== 0) {
      return byStatus;
    }
  }
  if (sortBy === "reconciliation") {
    const byRecon =
      (a.reconciliationStatus ?? "").localeCompare(b.reconciliationStatus ?? "") *
      dir;
    if (byRecon !== 0) {
      return byRecon;
    }
  }
  const byOpco = a.opcoName.localeCompare(b.opcoName);
  if (byOpco !== 0) {
    return byOpco * (sortBy === "lane" ? dir : 1);
  }
  return a.partnerName.localeCompare(b.partnerName) * (sortBy === "lane" ? dir : 1);
}

function overallStatusTone(
  status: ReportingLaneStatus,
): "success" | "warning" | "danger" | "neutral" {
  switch (status) {
    case "Complete":
      return "success";
    case "Partial":
      return "warning";
    case "Missing":
      return "danger";
    default:
      return "neutral";
  }
}

function presentTone(value: boolean): "success" | "neutral" {
  return value ? "success" : "neutral";
}

function presentLabel(value: boolean): string {
  return value ? "Yes" : "No";
}

function reconciliationTone(
  status: string | null,
): "success" | "info" | "warning" | "neutral" {
  if (!status) {
    return "neutral";
  }
  const normalized = status.toUpperCase();
  if (normalized.includes("COMPLETE") || normalized.includes("MATCHED")) {
    return "success";
  }
  if (normalized.includes("PROGRESS")) {
    return "info";
  }
  if (normalized.includes("MISMATCH") || normalized.includes("FAIL")) {
    return "warning";
  }
  return "neutral";
}

function buildQuery(month: number, year: number, opcoId: string, partnerId: string) {
  const params = new URLSearchParams({
    month: String(month),
    year: String(year),
  });
  if (opcoId) {
    params.set("opcoId", opcoId);
  }
  if (partnerId) {
    params.set("partnerId", partnerId);
  }
  return params.toString();
}

/** Reconciliation compare uses searchBy + entityId (one org), not dual OpCo+Partner. */
function buildReconciliationQuery(
  month: number,
  year: number,
  opcoId: string,
  partnerId: string,
) {
  const params = new URLSearchParams({
    month: String(month),
    year: String(year),
  });
  if (opcoId) {
    params.set("searchBy", "opco");
    params.set("entityId", opcoId);
  } else if (partnerId) {
    params.set("searchBy", "partner");
    params.set("entityId", partnerId);
  }
  return params.toString();
}

function ProgressHint({ done, total }: { done: number; total: number }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div className="mt-2 space-y-1">
      <div className="h-1.5 overflow-hidden rounded-full bg-white/70">
        <div
          className="h-full rounded-full bg-primary/80 transition-[width]"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-foreground-subtle">{pct}% of pairs</p>
    </div>
  );
}

function QuickLink({
  href,
  label,
  description,
}: {
  href: string;
  label: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-border bg-surface px-4 py-3 shadow-[var(--shadow-sm)] transition-colors hover:border-primary/40 hover:bg-primary-muted/40"
    >
      <p className="text-sm font-semibold text-foreground group-hover:text-primary">
        {label}
      </p>
      <p className="mt-0.5 text-xs text-foreground-subtle">{description}</p>
    </Link>
  );
}

function StatusFilterChip({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 rounded-2xl border px-3 py-1.5 text-sm transition-colors",
        active
          ? "border-primary bg-primary-muted font-semibold text-primary"
          : "border-border bg-surface text-foreground-muted hover:bg-surface-muted",
      )}
    >
      {label}
      <span
        className={cn(
          "rounded-full px-1.5 py-0.5 text-xs tabular-nums",
          active ? "bg-primary/15 text-primary" : "bg-surface-muted text-foreground-subtle",
        )}
      >
        {count}
      </span>
    </button>
  );
}

type ReportingViewProps = {
  initialOverview: ReportingOverview;
  initialFilterOptions: ReportFilterOptions;
};

export function ReportingView({
  initialOverview,
  initialFilterOptions,
}: ReportingViewProps) {
  const [overview, setOverview] = useState(initialOverview);
  const [filterOptions, setFilterOptions] =
    useState<ReportFilterOptions>(initialFilterOptions);

  const [month, setMonth] = useState(initialOverview.filters.month);
  const [year, setYear] = useState(initialOverview.filters.year);
  const [opcoId, setOpcoId] = useState(initialOverview.filters.opcoId ?? "");
  const [partnerId, setPartnerId] = useState(initialOverview.filters.partnerId ?? "");

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [lanePage, setLanePage] = useState(1);
  const [sortBy, setSortBy] = useState<LaneSortField>("lane");
  const [sortDir, setSortDir] = useState<SortDirection>("asc");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadOverview = useCallback(
    async (overrides?: {
      month?: number;
      year?: number;
      opcoId?: string;
      partnerId?: string;
    }) => {
      const nextMonth = overrides?.month ?? month;
      const nextYear = overrides?.year ?? year;
      const nextOpcoId = overrides?.opcoId ?? opcoId;
      const nextPartnerId = overrides?.partnerId ?? partnerId;
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/dizlee/reporting?${buildQuery(nextMonth, nextYear, nextOpcoId, nextPartnerId)}`,
        );
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(formatAppError(payload, "Failed to load reporting"));
        }
        setOverview(payload.data as ReportingOverview);
        setFilterOptions(payload.filterOptions as ReportFilterOptions);
        setLanePage(1);
        setStatusFilter("all");
        setSearch("");
      } catch (loadError) {
        setError(
          loadError instanceof Error ? loadError.message : "Failed to load reporting",
        );
      } finally {
        setLoading(false);
      }
    },
    [month, opcoId, partnerId, year],
  );

  const clearFilters = () => {
    const period = getCurrentPeriod();
    setMonth(period.month);
    setYear(period.year);
    setOpcoId("");
    setPartnerId("");
    setStatusFilter("all");
    setSearch("");
    setLanePage(1);
    void loadOverview({
      month: period.month,
      year: period.year,
      opcoId: "",
      partnerId: "",
    });
  };

  const yearOptions = getPeriodYearOptions();
  const maxMonth = getMaxMonthForYear(year);

  const { summary } = overview;
  const detailQuery = buildQuery(
    overview.filters.month,
    overview.filters.year,
    overview.filters.opcoId ?? "",
    overview.filters.partnerId ?? "",
  );
  const reconciliationQuery = buildReconciliationQuery(
    overview.filters.month,
    overview.filters.year,
    overview.filters.opcoId ?? "",
    overview.filters.partnerId ?? "",
  );

  const statusCounts = useMemo(() => {
    const counts = { all: overview.lanes.length, Complete: 0, Partial: 0, Missing: 0 };
    for (const lane of overview.lanes) {
      counts[lane.overallStatus] += 1;
    }
    return counts;
  }, [overview.lanes]);

  const filteredLanes = useMemo(() => {
    const term = debouncedSearch.trim().toLowerCase();
    return overview.lanes
      .filter((lane) => {
        if (statusFilter !== "all" && lane.overallStatus !== statusFilter) {
          return false;
        }
        if (!term) {
          return true;
        }
        return (
          lane.opcoName.toLowerCase().includes(term) ||
          lane.partnerName.toLowerCase().includes(term)
        );
      })
      .sort((a, b) => compareLanes(a, b, sortBy, sortDir));
  }, [debouncedSearch, overview.lanes, sortBy, sortDir, statusFilter]);

  const pagedLanes = useMemo(
    () => paginateItems(filteredLanes, lanePage),
    [filteredLanes, lanePage],
  );

  const applySort = (field: LaneSortField) => {
    const next = nextSortState(sortBy, sortDir, field);
    setSortBy(next.sortBy);
    setSortDir(next.sortDir);
    setLanePage(1);
  };

  const setStatusAndResetPage = (next: StatusFilter) => {
    setStatusFilter(next);
    setLanePage(1);
  };

  const onSearchChange = (value: string) => {
    setSearch(value);
    setLanePage(1);
  };

  return (
    <PageCard>
      <PageHeader
        title="Reporting"
        description="Period overview for reports, invoices, and reconciliation."
      />

      {error ? <div className={`mt-4 ${ui.alertError}`}>{error}</div> : null}

      <FilterToolbar className="mt-4">
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
          onApply={() => void loadOverview()}
          onClear={clearFilters}
          onRefresh={() => void loadOverview()}
          loading={loading}
        />
      </FilterToolbar>

      <LoadingOverlay active={loading} className="mt-4 min-h-[12rem]">
      <p className="mt-5 text-sm text-foreground-muted">
        Showing <span className="font-semibold text-foreground">{overview.period.label}</span>
        {" · "}
        {summary.linkedLanes} linked pair{summary.linkedLanes === 1 ? "" : "s"}
      </p>

      <section className="mt-5 space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Coverage</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="Linked pairs"
            value={String(summary.linkedLanes)}
            tone="blue"
          />
          <div className="rounded-[28px] border border-border bg-surface p-2 shadow-[var(--shadow-md)]">
            <div className="rounded-[22px] bg-gradient-to-br from-[#e8f7f5] to-[#d7f0ec] p-4">
              <p className="text-xs font-semibold tracking-wide text-foreground-muted">
                Reports complete
              </p>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                {summary.reportsComplete}
                <span className="text-base font-medium text-foreground-subtle">
                  {" "}
                  / {summary.linkedLanes}
                </span>
              </p>
              <ProgressHint
                done={summary.reportsComplete}
                total={summary.linkedLanes}
              />
            </div>
          </div>
          <div className="rounded-[28px] border border-border bg-surface p-2 shadow-[var(--shadow-md)]">
            <div className="rounded-[22px] bg-gradient-to-br from-[#fff7ed] to-[#ffedd5] p-4">
              <p className="text-xs font-semibold tracking-wide text-foreground-muted">
                Invoices complete
              </p>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                {summary.invoicesComplete}
                <span className="text-base font-medium text-foreground-subtle">
                  {" "}
                  / {summary.linkedLanes}
                </span>
              </p>
              <ProgressHint
                done={summary.invoicesComplete}
                total={summary.linkedLanes}
              />
            </div>
          </div>
          <KpiCard
            label="Reconciliations run"
            value={String(summary.reconciliationsRun)}
            tone="purple"
          />
        </div>
      </section>

      <section className="mt-6 space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Billing snapshot</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <KpiCard label="Invoices" value={String(summary.invoiceCount)} tone="blue" />
          <KpiCard
            label="Invoices paid"
            value={String(summary.invoicesPaid)}
            tone="teal"
          />
          <KpiCard
            label="Revenue paid (USD)"
            value={formatUsd(summary.totalRevenuePaidUsd)}
            tone="amber"
          />
        </div>
      </section>

      <section className="mt-6 space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Open in detail</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <QuickLink
            href={`/dizlee/reports?${detailQuery}`}
            label="Reports"
            description="Submitted files for this period"
          />
          <QuickLink
            href={`/dizlee/invoices?${detailQuery}`}
            label="Invoices"
            description="Billing status and totals"
          />
          <QuickLink
            href={`/dizlee/reconciliation?${reconciliationQuery}`}
            label="Reconciliation"
            description="Compare and resolve pairs"
          />
        </div>
      </section>

      <section className="mt-8 space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              OpCo–Partner overview
            </h2>
            <p className="mt-1 text-sm text-foreground-muted">
              Lane-level checklist for the selected period.
            </p>
          </div>
        </div>

        <ListSearch
          className="mt-0"
          value={search}
          onChange={onSearchChange}
          placeholder="Search OpCo or Partner"
        />

        <div className="flex flex-wrap gap-2">
          <StatusFilterChip
            active={statusFilter === "all"}
            label="All"
            count={statusCounts.all}
            onClick={() => setStatusAndResetPage("all")}
          />
          <StatusFilterChip
            active={statusFilter === "Complete"}
            label="Complete"
            count={statusCounts.Complete}
            onClick={() => setStatusAndResetPage("Complete")}
          />
          <StatusFilterChip
            active={statusFilter === "Partial"}
            label="Partial"
            count={statusCounts.Partial}
            onClick={() => setStatusAndResetPage("Partial")}
          />
          <StatusFilterChip
            active={statusFilter === "Missing"}
            label="Missing"
            count={statusCounts.Missing}
            onClick={() => setStatusAndResetPage("Missing")}
          />
        </div>

        {pagedLanes.total === 0 ? (
          <EmptyState
            title="No pairs match"
            description="Try another status filter or search term."
          />
        ) : (
          <div className="space-y-4">
            <DataTableFrame>
              <DataTable>
                <DataTableHead>
                  <tr>
                    <SortableDataTableTh
                      label="OpCo / Partner"
                      active={sortBy === "lane"}
                      direction={sortDir}
                      onSort={() => applySort("lane")}
                    />
                    <DataTableTh align="center">OpCo report</DataTableTh>
                    <DataTableTh align="center">Partner report</DataTableTh>
                    <DataTableTh align="center">OpCo invoice</DataTableTh>
                    <DataTableTh align="center">Partner invoice</DataTableTh>
                    <SortableDataTableTh
                      label="Reconciliation"
                      active={sortBy === "reconciliation"}
                      direction={sortDir}
                      onSort={() => applySort("reconciliation")}
                      align="center"
                    />
                    <SortableDataTableTh
                      label="Overall"
                      active={sortBy === "overall"}
                      direction={sortDir}
                      onSort={() => applySort("overall")}
                      align="center"
                    />
                  </tr>
                </DataTableHead>
                <tbody>
                  {pagedLanes.items.map((lane: ReportingLaneRow) => (
                    <DataTableRow key={lane.laneKey}>
                      <DataTableTd>
                        <p className="font-medium text-foreground">{lane.opcoName}</p>
                        <p className="text-xs text-foreground-subtle">
                          {lane.partnerName}
                        </p>
                      </DataTableTd>
                      <DataTableTd align="center">
                        <StatusPill tone={presentTone(lane.opcoReport)}>
                          {presentLabel(lane.opcoReport)}
                        </StatusPill>
                      </DataTableTd>
                      <DataTableTd align="center">
                        <StatusPill tone={presentTone(lane.partnerReport)}>
                          {presentLabel(lane.partnerReport)}
                        </StatusPill>
                      </DataTableTd>
                      <DataTableTd align="center">
                        <StatusPill tone={presentTone(lane.opcoInvoice)}>
                          {presentLabel(lane.opcoInvoice)}
                        </StatusPill>
                      </DataTableTd>
                      <DataTableTd align="center">
                        <StatusPill tone={presentTone(lane.partnerInvoice)}>
                          {presentLabel(lane.partnerInvoice)}
                        </StatusPill>
                      </DataTableTd>
                      <DataTableTd align="center">
                        {lane.reconciliationStatus ? (
                          <StatusPill
                            tone={reconciliationTone(lane.reconciliationStatus)}
                          >
                            {lane.reconciliationStatus}
                          </StatusPill>
                        ) : (
                          <span className="text-sm text-foreground-subtle">Not run</span>
                        )}
                      </DataTableTd>
                      <DataTableTd align="center">
                        <StatusPill tone={overallStatusTone(lane.overallStatus)}>
                          {lane.overallStatus}
                        </StatusPill>
                      </DataTableTd>
                    </DataTableRow>
                  ))}
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
        )}
      </section>
      </LoadingOverlay>
    </PageCard>
  );
}




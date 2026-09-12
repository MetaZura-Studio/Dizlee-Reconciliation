/**
 * Monthly period scorecard: OpCo rollup with monitoring links.
 */

"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";

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
import { FilterToolbar, PageCard, PageHeader } from "@/components/ui/page";
import { StatusPill } from "@/components/ui/status-pill";
import { LoadingOverlay } from "@/components/ui/loading";
import { cn, ui } from "@/lib/ui/classes";
import { nextSortState, type SortDirection } from "@/lib/ui/sort";
import { useDebouncedValue } from "@/lib/ui/use-debounced-value";
import type { ReportFilterOptions } from "@/lib/dizlee/reports";
import {
  getCurrentPeriod,
  getMaxMonthForYear,
  getPeriodYearOptions,
} from "@/lib/platform/period";
import type {
  ReportingOpcoRow,
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

type OpcoSortField =
  | "opco"
  | "partners"
  | "partnerReports"
  | "recon"
  | "revenue";

function presentTone(value: boolean): "success" | "neutral" {
  return value ? "success" : "neutral";
}

function presentLabel(value: boolean): string {
  return value ? "Yes" : "No";
}

function ratioLabel(received: number, expected: number): string {
  return `${received} / ${expected}`;
}

function compareOpcos(
  a: ReportingOpcoRow,
  b: ReportingOpcoRow,
  sortBy: OpcoSortField,
  sortDir: SortDirection,
): number {
  const dir = sortDir === "asc" ? 1 : -1;
  if (sortBy === "partners") {
    return (a.partnerCount - b.partnerCount) * dir;
  }
  if (sortBy === "partnerReports") {
    const ar =
      a.partnerReportsExpected === 0
        ? 0
        : a.partnerReportsReceived / a.partnerReportsExpected;
    const br =
      b.partnerReportsExpected === 0
        ? 0
        : b.partnerReportsReceived / b.partnerReportsExpected;
    if (ar !== br) {
      return (ar - br) * dir;
    }
  }
  if (sortBy === "recon") {
    const ar =
      a.reconciliationsExpected === 0
        ? 0
        : a.reconciliationsDone / a.reconciliationsExpected;
    const br =
      b.reconciliationsExpected === 0
        ? 0
        : b.reconciliationsDone / b.reconciliationsExpected;
    if (ar !== br) {
      return (ar - br) * dir;
    }
  }
  if (sortBy === "revenue") {
    return ((a.revenuePaidUsd ?? 0) - (b.revenuePaidUsd ?? 0)) * dir;
  }
  return a.opcoName.localeCompare(b.opcoName) * dir;
}

function buildQuery(month: number, year: number, opcoId: string) {
  const params = new URLSearchParams({
    month: String(month),
    year: String(year),
  });
  if (opcoId) {
    params.set("opcoId", opcoId);
  }
  return params.toString();
}

export function ReportingView({
  initialOverview,
  initialFilterOptions,
}: {
  initialOverview: ReportingOverview;
  initialFilterOptions: ReportFilterOptions;
}) {
  const [overview, setOverview] = useState(initialOverview);
  const [filterOptions, setFilterOptions] =
    useState<ReportFilterOptions>(initialFilterOptions);

  const [month, setMonth] = useState(initialOverview.filters.month);
  const [year, setYear] = useState(initialOverview.filters.year);
  const [opcoId, setOpcoId] = useState(initialOverview.filters.opcoId ?? "");

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [sortBy, setSortBy] = useState<OpcoSortField>("opco");
  const [sortDir, setSortDir] = useState<SortDirection>("asc");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadOverview = useCallback(
    async (overrides?: { month?: number; year?: number; opcoId?: string }) => {
      const nextMonth = overrides?.month ?? month;
      const nextYear = overrides?.year ?? year;
      const nextOpcoId = overrides?.opcoId ?? opcoId;
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/dizlee/reporting?${buildQuery(nextMonth, nextYear, nextOpcoId)}`,
        );
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(formatAppError(payload, "Failed to load reporting"));
        }
        setOverview(payload.data as ReportingOverview);
        setFilterOptions(payload.filterOptions as ReportFilterOptions);
        setSearch("");
      } catch (loadError) {
        setError(
          loadError instanceof Error ? loadError.message : "Failed to load reporting",
        );
      } finally {
        setLoading(false);
      }
    },
    [month, opcoId, year],
  );

  const clearFilters = () => {
    const period = getCurrentPeriod();
    setMonth(period.month);
    setYear(period.year);
    setOpcoId("");
    setSearch("");
    void loadOverview({
      month: period.month,
      year: period.year,
      opcoId: "",
    });
  };

  const yearOptions = getPeriodYearOptions();
  const maxMonth = getMaxMonthForYear(year);

  const filteredOpcos = useMemo(() => {
    const term = debouncedSearch.trim().toLowerCase();
    return overview.opcos
      .filter((row) =>
        term ? row.opcoName.toLowerCase().includes(term) : true,
      )
      .sort((a, b) => compareOpcos(a, b, sortBy, sortDir));
  }, [debouncedSearch, overview.opcos, sortBy, sortDir]);

  const applySort = (field: OpcoSortField) => {
    const next = nextSortState(sortBy, sortDir, field);
    setSortBy(next.sortBy);
    setSortDir(next.sortDir);
  };

  const rsHref = `/dizlee/revenue-share?month=${overview.filters.month}&year=${overview.filters.year}`;
  const invoicesHref = `/dizlee/invoices/monitoring?month=${overview.filters.month}&year=${overview.filters.year}&from=reporting`;
  const reconHref = `/dizlee/reconciliation?month=${overview.filters.month}&year=${overview.filters.year}`;

  return (
    <PageCard>
      <PageHeader
        title="Reporting"
        description={`Monthly period scorecard for ${overview.period.label} — OpCo readiness across reports, reconciliation, invoices, and RS.`}
      />

      {error ? <div className={`mt-4 ${ui.alertError}`}>{error}</div> : null}

      <FilterToolbar className="mt-4">
        <div className="grid w-full gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
        </div>
        <FilterActions
          onApply={() => void loadOverview()}
          onClear={clearFilters}
          onRefresh={() => void loadOverview()}
          loading={loading}
        />
      </FilterToolbar>

      <LoadingOverlay active={loading} className="mt-6 min-h-[12rem]">
        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-foreground">
                OpCo scorecard
              </h2>
              <p className="mt-1 text-sm text-foreground-muted">
                One row per OpCo. Partner and recon counts are over linked pairs;
                OpCo invoice and RS are OpCo-scoped.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-sm">
              <Link href={invoicesHref} className="text-primary hover:underline">
                Invoice monitoring
              </Link>
              <span className="text-foreground-subtle">·</span>
              <Link href={reconHref} className="text-primary hover:underline">
                Reconciliation
              </Link>
              <span className="text-foreground-subtle">·</span>
              <Link href={rsHref} className="text-primary hover:underline">
                RS Reports
              </Link>
            </div>
          </div>

          <ListSearch
            className="mt-0"
            value={search}
            onChange={setSearch}
            placeholder="Search OpCo"
          />

          {filteredOpcos.length === 0 ? (
            <EmptyState
              title="No OpCos in scope"
              description="Adjust period or OpCo filter to see the scorecard."
            />
          ) : (
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
                    <SortableDataTableTh
                      label="Partners"
                      active={sortBy === "partners"}
                      direction={sortDir}
                      onSort={() => applySort("partners")}
                      align="center"
                    />
                    <DataTableTh align="center">OpCo report</DataTableTh>
                    <SortableDataTableTh
                      label="Partner reports"
                      active={sortBy === "partnerReports"}
                      direction={sortDir}
                      onSort={() => applySort("partnerReports")}
                      align="center"
                    />
                    <SortableDataTableTh
                      label="Recon"
                      active={sortBy === "recon"}
                      direction={sortDir}
                      onSort={() => applySort("recon")}
                      align="center"
                    />
                    <DataTableTh align="center">OpCo invoice</DataTableTh>
                    <DataTableTh align="center">Partner invoices</DataTableTh>
                    <DataTableTh align="center">RS</DataTableTh>
                    <SortableDataTableTh
                      label="Paid (USD)"
                      active={sortBy === "revenue"}
                      direction={sortDir}
                      onSort={() => applySort("revenue")}
                      align="right"
                    />
                  </tr>
                </DataTableHead>
                <tbody>
                  {filteredOpcos.map((row) => (
                    <DataTableRow key={row.opcoId}>
                      <DataTableTd>
                        <p className="font-medium text-foreground">{row.opcoName}</p>
                      </DataTableTd>
                      <DataTableTd align="center">{row.partnerCount}</DataTableTd>
                      <DataTableTd align="center">
                        <StatusPill tone={presentTone(row.opcoReport)}>
                          {presentLabel(row.opcoReport)}
                        </StatusPill>
                      </DataTableTd>
                      <DataTableTd align="center">
                        <span
                          className={cn(
                            row.partnerReportsReceived ===
                              row.partnerReportsExpected
                              ? "text-foreground"
                              : "text-warning",
                          )}
                        >
                          {ratioLabel(
                            row.partnerReportsReceived,
                            row.partnerReportsExpected,
                          )}
                        </span>
                      </DataTableTd>
                      <DataTableTd align="center">
                        <div className="space-y-0.5">
                          <p>
                            {ratioLabel(
                              row.reconciliationsDone,
                              row.reconciliationsExpected,
                            )}
                          </p>
                          <p className="text-xs text-foreground-subtle">
                            {row.reconciliationsMatched} matched
                          </p>
                        </div>
                      </DataTableTd>
                      <DataTableTd align="center">
                        <StatusPill tone={presentTone(row.opcoInvoice)}>
                          {presentLabel(row.opcoInvoice)}
                        </StatusPill>
                      </DataTableTd>
                      <DataTableTd align="center">
                        {ratioLabel(
                          row.partnerInvoicesReceived,
                          row.partnerInvoicesExpected,
                        )}
                      </DataTableTd>
                      <DataTableTd align="center">
                        <StatusPill tone={presentTone(row.rsGenerated)}>
                          {presentLabel(row.rsGenerated)}
                        </StatusPill>
                      </DataTableTd>
                      <DataTableTd align="right">
                        <div className="space-y-0.5">
                          <p className="font-medium text-foreground">
                            {row.revenuePaidUsd != null
                              ? formatUsd(row.revenuePaidUsd)
                              : "—"}
                          </p>
                          <p className="text-xs text-foreground-subtle">
                            Invoiced{" "}
                            {row.revenueInvoicedUsd != null
                              ? formatUsd(row.revenueInvoicedUsd)
                              : "—"}
                          </p>
                        </div>
                      </DataTableTd>
                    </DataTableRow>
                  ))}
                </tbody>
              </DataTable>
            </DataTableFrame>
          )}
        </section>
      </LoadingOverlay>
    </PageCard>
  );
}

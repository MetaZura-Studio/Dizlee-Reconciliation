/**
 * Dizlee: OpCo + Partner + month gross revenue from the OpCo report.
 */

"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";

import {
  DataTable,
  DataTableFrame,
  DataTableHead,
  DataTableRow,
  DataTableTd,
  DataTableTh,
} from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterActions } from "@/components/ui/filter-actions";
import { LoadingOverlay } from "@/components/ui/loading";
import { FilterToolbar, PageCard, PageHeader } from "@/components/ui/page";
import type {
  PeriodRevenueFilterOptions,
  PeriodRevenueFilters,
  PeriodRevenueResult,
} from "@/lib/dizlee/period-revenue.shared";
import { formatAppError } from "@/lib/errors/format";
import { formatMoney, formatUsd } from "@/lib/platform/format-money";
import {
  getCurrentPeriod,
  getMaxMonthForYear,
  getPeriodYearOptions,
} from "@/lib/platform/period";
import { ui } from "@/lib/ui/classes";

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

type PeriodRevenueViewProps = {
  initialResult: PeriodRevenueResult;
  initialFilterOptions: PeriodRevenueFilterOptions;
};

function buildQuery(filters: PeriodRevenueFilters): string {
  const params = new URLSearchParams({
    month: String(filters.month),
    year: String(filters.year),
  });
  if (filters.opcoId) {
    params.set("opcoId", filters.opcoId);
  }
  if (filters.partnerId) {
    params.set("partnerId", filters.partnerId);
  }
  return `?${params.toString()}`;
}

export function PeriodRevenueView({
  initialResult,
  initialFilterOptions,
}: PeriodRevenueViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const current = getCurrentPeriod();

  const [result, setResult] = useState(initialResult);
  const [filterOptions] = useState(initialFilterOptions);
  const [month, setMonth] = useState(initialResult.filters.month);
  const [year, setYear] = useState(initialResult.filters.year);
  const [opcoId, setOpcoId] = useState(initialResult.filters.opcoId ?? "");
  const [partnerId, setPartnerId] = useState(
    initialResult.filters.partnerId ?? "",
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const yearOptions = useMemo(() => getPeriodYearOptions(), []);
  const maxMonth = getMaxMonthForYear(year);
  const partners = opcoId
    ? (filterOptions.partnersByOpcoId[opcoId] ?? [])
    : [];

  const load = useCallback(
    (filters: PeriodRevenueFilters) => {
      startTransition(async () => {
        setError(null);
        try {
          const qs = buildQuery(filters);
          router.replace(`${pathname}${qs}`, { scroll: false });
          const response = await fetch(`/api/dizlee/period-revenue${qs}`);
          const payload = (await response.json().catch(() => ({}))) as {
            data?: PeriodRevenueResult;
            error?: unknown;
          };
          if (!response.ok || !payload.data) {
            throw new Error(
              formatAppError(payload, "Failed to load OpCo–Partner revenue"),
            );
          }
          setResult(payload.data);
        } catch (loadError) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load OpCo–Partner revenue",
          );
        }
      });
    },
    [pathname, router],
  );

  const apply = () => {
    if (!opcoId || !partnerId) {
      setError("Select both OpCo and Partner.");
      return;
    }
    load({
      month,
      year,
      opcoId,
      partnerId,
    });
  };

  const clearFilters = () => {
    setMonth(current.month);
    setYear(current.year);
    setOpcoId("");
    setPartnerId("");
    load({ month: current.month, year: current.year });
  };

  const canQuery = Boolean(opcoId && partnerId);
  const hasSelection = Boolean(result.filters.opcoId && result.filters.partnerId);

  return (
    <PageCard>
      <PageHeader
        title="OpCo–Partner revenue"
        description="Gross sales from the OpCo report for a selected OpCo, Partner, and month. Service amounts match the uploaded OpCo file."
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
                if (month > capped) {
                  setMonth(capped);
                }
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
              onChange={(event) => {
                setOpcoId(event.target.value);
                setPartnerId("");
              }}
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

          <label className="text-sm">
            <span className={ui.label}>Partner</span>
            <select
              value={partnerId}
              disabled={!opcoId}
              onChange={(event) => setPartnerId(event.target.value)}
              className={ui.select}
            >
              <option value="">
                {opcoId ? "Select Partner" : "Select OpCo first"}
              </option>
              {partners.map((partner) => (
                <option key={partner.id} value={partner.id}>
                  {partner.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <FilterActions
          onApply={apply}
          onClear={clearFilters}
          onRefresh={canQuery ? apply : undefined}
          loading={pending}
        />
      </FilterToolbar>

      <LoadingOverlay active={pending} className="mt-6 min-h-[12rem]">
        {!hasSelection ? (
          <EmptyState
            title="Select OpCo and Partner"
            description="Choose a period, OpCo, and linked Partner, then Apply to see gross sales from the OpCo report."
          />
        ) : !result.report ? (
          <EmptyState
            title="No OpCo report for this selection"
            description="Upload the OpCo bulk report for this period (with this Partner’s services) to see revenue here."
          />
        ) : (
          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-surface-muted/40 p-4 sm:p-5">
              <p className="text-sm text-foreground-muted">
                {result.report.opcoName} · {result.report.partnerName} ·{" "}
                {MONTHS[result.filters.month - 1]} {result.filters.year}
                <span className="text-foreground-subtle">
                  {" "}
                  · OpCo report v{result.report.version}
                </span>
              </p>
              <div className="mt-3 flex flex-wrap gap-6">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-foreground-muted">
                    Total gross ({result.currencyCode})
                  </p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
                    {formatMoney(result.totalLc, result.currencyCode)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-foreground-muted">
                    Total gross (USD)
                  </p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
                    {formatUsd(result.totalUsd)}
                  </p>
                </div>
              </div>
              {result.missingFx ? (
                <p className={`mt-3 ${ui.alertWarning}`}>
                  No USD FX rate for {result.currencyCode} in this period.
                  Local amounts are shown; add the rate under Admin →
                  Currencies to see USD.
                </p>
              ) : null}
            </div>

            {result.services.length === 0 ? (
              <EmptyState
                title="Report has no line items"
                description="The OpCo report for this Partner exists but has no service rows."
              />
            ) : (
              <DataTableFrame>
                <DataTable>
                  <DataTableHead>
                    <tr>
                      <DataTableTh>Service</DataTableTh>
                      <DataTableTh align="right">
                        Gross ({result.currencyCode})
                      </DataTableTh>
                      <DataTableTh align="right">Gross (USD)</DataTableTh>
                    </tr>
                  </DataTableHead>
                  <tbody>
                    {result.services.map((row) => (
                      <DataTableRow key={row.serviceName}>
                        <DataTableTd className="font-medium text-foreground">
                          {row.serviceName}
                        </DataTableTd>
                        <DataTableTd
                          align="right"
                          className="tabular-nums text-foreground"
                        >
                          {formatMoney(row.grossLc, result.currencyCode, {
                            style: "decimal",
                          })}
                        </DataTableTd>
                        <DataTableTd
                          align="right"
                          className="tabular-nums text-foreground-muted"
                        >
                          {formatUsd(row.grossUsd, { style: "decimal" })}
                        </DataTableTd>
                      </DataTableRow>
                    ))}
                  </tbody>
                </DataTable>
              </DataTableFrame>
            )}
          </div>
        )}
      </LoadingOverlay>
    </PageCard>
  );
}

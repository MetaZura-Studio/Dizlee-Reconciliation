/**
 * Generate and download the Dizlee Revenue Share Report after all uploads.
 */

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

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
import { LoadingOverlay } from "@/components/ui/loading";
import { FilterToolbar, PageCard, PageHeader } from "@/components/ui/page";
import { StatusPill } from "@/components/ui/status-pill";
import { cn, ui } from "@/lib/ui/classes";
import type { ReportFilterOptions } from "@/lib/dizlee/reports";
import type { RevenueShareReadiness } from "@/lib/dizlee/revenue-share";
import {
  getCurrentPeriod,
  getMaxMonthForYear,
  getPeriodYearOptions,
} from "@/lib/platform/period";
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

function buildQuery(month: number, year: number, opcoId: string): string {
  return new URLSearchParams({
    month: String(month),
    year: String(year),
    opcoId,
  }).toString();
}

type RevenueShareViewProps = {
  initialMonth: number;
  initialYear: number;
  initialOpcoId: string;
  initialFilterOptions: ReportFilterOptions;
  initialReadiness: RevenueShareReadiness | null;
};

export function RevenueShareView({
  initialMonth,
  initialYear,
  initialOpcoId,
  initialFilterOptions,
  initialReadiness,
}: RevenueShareViewProps) {
  const [month, setMonth] = useState(initialMonth);
  const [year, setYear] = useState(initialYear);
  const [opcoId, setOpcoId] = useState(initialOpcoId);
  const [filterOptions, setFilterOptions] = useState(initialFilterOptions);
  const [readiness, setReadiness] = useState(initialReadiness);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          `/api/dizlee/revenue-share/readiness?${buildQuery(nextMonth, nextYear, nextOpcoId)}`,
        );
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(formatAppError(payload, "Failed to load readiness"));
        }
        setReadiness(payload.data as RevenueShareReadiness);
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

  useEffect(() => {
    const handleFocus = () => {
      if (opcoId) {
        void loadReadiness(month, year, opcoId);
      }
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [loadReadiness, month, opcoId, year]);

  const yearOptions = getPeriodYearOptions();
  const maxMonth = getMaxMonthForYear(year);
  const canDownload = Boolean(readiness?.ready && opcoId);

  const missingLabel = useMemo(() => {
    if (!readiness || readiness.ready) {
      return null;
    }
    if (readiness.linkedCount === 0) {
      return "This OpCo has no linked Partners.";
    }
    return `Waiting on: ${readiness.missing.join(", ")}`;
  }, [readiness]);

  return (
    <PageCard>
      <PageHeader
        title="Revenue Share Report"
        description="Download Partner / Service / Gross / Regulatory Fee / Net / Share % after the OpCo bulk file is in and every Partner found in that file has uploaded. Fee uses the OpCo tax %; Share % comes from the OpCo RS % column."
      />

      <FilterToolbar>
        <label className={cn(ui.label, "min-w-40")}>
          Month
          <select
            className={ui.select}
            value={month}
            onChange={(event) => setMonth(Number(event.target.value))}
          >
            {MONTHS.slice(0, maxMonth).map((label, index) => (
              <option key={label} value={index + 1}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className={cn(ui.label, "min-w-28")}>
          Year
          <select
            className={ui.select}
            value={year}
            onChange={(event) => setYear(Number(event.target.value))}
          >
            {yearOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className={cn(ui.label, "min-w-56")}>
          OpCo
          <select
            className={ui.select}
            value={opcoId}
            onChange={(event) => setOpcoId(event.target.value)}
          >
            <option value="">Select OpCo</option>
            {filterOptions.opcos.map((opco) => (
              <option key={opco.id} value={opco.id}>
                {opco.name}
              </option>
            ))}
          </select>
        </label>
        <Button
          type="button"
          variant="secondary"
          onClick={() => void loadReadiness(month, year, opcoId)}
        >
          Check readiness
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            const period = getCurrentPeriod();
            setMonth(period.month);
            setYear(period.year);
            setOpcoId("");
            setReadiness(null);
          }}
        >
          Reset
        </Button>
        <Button
          type="button"
          disabled={!canDownload}
          onClick={() => {
            window.location.href = `/api/dizlee/revenue-share/export?${buildQuery(month, year, opcoId)}`;
          }}
        >
          Download Excel
        </Button>
      </FilterToolbar>

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
      {missingLabel ? (
        <p className="mt-4 text-sm text-amber-800">{missingLabel}</p>
      ) : null}
      {readiness ? (
        <p className="mt-4 text-sm text-foreground-muted">
          Regulatory fee for {readiness.opcoName}: {readiness.vatPercent}% of
          gross (Net = Gross − Fee).
        </p>
      ) : null}
      {readiness?.ready ? (
        <p className="mt-2 text-sm text-emerald-800">
          All OpCo and Partner reports are in for {readiness.period.label}.
        </p>
      ) : null}

      <LoadingOverlay active={loading} className="mt-6">
        {!readiness ? (
          <EmptyState title="Select an OpCo and period to check uploads." />
        ) : (
          <DataTableFrame>
            <DataTable>
              <DataTableHead>
                <DataTableRow>
                  <DataTableTh>Partner</DataTableTh>
                  <DataTableTh>OpCo report</DataTableTh>
                  <DataTableTh>Partner report</DataTableTh>
                </DataTableRow>
              </DataTableHead>
              <tbody>
                {readiness.partners.map((partner) => (
                  <DataTableRow key={partner.partnerId}>
                    <DataTableTd>{partner.partnerName}</DataTableTd>
                    <DataTableTd>
                      <StatusPill
                        tone={partner.hasOpcoReport ? "success" : "warning"}
                      >
                        {partner.hasOpcoReport
                          ? `${partner.opcoLineItemCount} lines`
                          : "Missing"}
                      </StatusPill>
                    </DataTableTd>
                    <DataTableTd>
                      <StatusPill
                        tone={partner.hasPartnerReport ? "success" : "warning"}
                      >
                        {partner.hasPartnerReport
                          ? `${partner.partnerLineItemCount} lines`
                          : "Missing"}
                      </StatusPill>
                    </DataTableTd>
                  </DataTableRow>
                ))}
              </tbody>
            </DataTable>
          </DataTableFrame>
        )}
      </LoadingOverlay>
    </PageCard>
  );
}

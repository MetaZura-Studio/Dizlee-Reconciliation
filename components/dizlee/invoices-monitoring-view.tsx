/**
 * Monitoring dashboard for invoice submission and payment status by pair.
 * Surfaces gaps and overdue items for a selected period.
 */

"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { KpiCard } from "@/components/dizlee/kpi-card";
import { InvoicesTabs } from "@/components/dizlee/invoices-tabs";
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
import { IconEye } from "@/components/ui/icons";
import { FilterToolbar, PageCard, PageHeader } from "@/components/ui/page";
import { StatusPill } from "@/components/ui/status-pill";
import { LoadingOverlay } from "@/components/ui/loading";
import { ui } from "@/lib/ui/classes";
import { nextSortState, type SortDirection } from "@/lib/ui/sort";
import type { InvoiceFilterOptions } from "@/lib/dizlee/invoices";
import {
  getCurrentPeriod,
  getMaxMonthForYear,
  getPeriodYearOptions,
} from "@/lib/platform/period";
import type {
  InvoiceMissingSideFilter,
  InvoiceMonitoringFilters,
  InvoiceMonitoringResult,
  InvoiceMonitoringSortField,
} from "@/lib/dizlee/invoices-monitoring";

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

function formatDateTime(value: string | null): string {
  if (!value) {
    return "—";
  }
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

function invoiceStatusTone(status: "Invoiced" | "Missing"): "success" | "warning" {
  return status === "Invoiced" ? "success" : "warning";
}

function buildQuery(filters: InvoiceMonitoringFilters): string {
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
  if (filters.missing) {
    params.set("missing", filters.missing);
  }
  return params.toString();
}

type InvoicesMonitoringViewProps = {
  initialResult: InvoiceMonitoringResult;
  initialFilterOptions: InvoiceFilterOptions;
  fromDashboard?: boolean;
};

export function InvoicesMonitoringView({
  initialResult,
  initialFilterOptions,
  fromDashboard = false,
}: InvoicesMonitoringViewProps) {
  const [month, setMonth] = useState(initialResult.filters.month);
  const [year, setYear] = useState(initialResult.filters.year);
  const [opcoId, setOpcoId] = useState(initialResult.filters.opcoId ?? "");
  const [partnerId, setPartnerId] = useState(initialResult.filters.partnerId ?? "");
  const [missing, setMissing] = useState<InvoiceMissingSideFilter | "">(
    initialResult.filters.missing ?? "",
  );
  const [sortBy, setSortBy] = useState<InvoiceMonitoringSortField>(
    initialResult.filters.sortBy,
  );
  const [sortDir, setSortDir] = useState<SortDirection>(
    initialResult.filters.sortDir,
  );

  const [result, setResult] = useState<InvoiceMonitoringResult>(initialResult);
  const [filterOptions, setFilterOptions] =
    useState<InvoiceFilterOptions>(initialFilterOptions);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const skipAutoReload = useRef(true);

  const loadMonitoring = useCallback(async (filters: InvoiceMonitoringFilters) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/dizlee/invoices/monitoring?${buildQuery(filters)}`,
      );
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to load invoice monitoring");
      }
      setResult(payload.data as InvoiceMonitoringResult);
      setFilterOptions(payload.filterOptions as InvoiceFilterOptions);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load invoice monitoring",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (skipAutoReload.current) {
      skipAutoReload.current = false;
      return;
    }
    void loadMonitoring({
      month,
      year,
      opcoId: opcoId || undefined,
      partnerId: partnerId || undefined,
      missing: missing || undefined,
      page: 1,
      sortBy,
      sortDir,
    });
  }, [month, year, opcoId, partnerId, missing, sortBy, sortDir, loadMonitoring]);

  const applySort = (field: InvoiceMonitoringSortField) => {
    const next = nextSortState(sortBy, sortDir, field);
    setSortBy(next.sortBy);
    setSortDir(next.sortDir);
  };

  const goToPage = (nextPage: number) => {
    void loadMonitoring({
      month,
      year,
      opcoId: opcoId || undefined,
      partnerId: partnerId || undefined,
      missing: missing || undefined,
      page: nextPage,
      sortBy,
      sortDir,
    });
  };

  const clearFilters = () => {
    const period = getCurrentPeriod();
    skipAutoReload.current = true;
    setMonth(period.month);
    setYear(period.year);
    setOpcoId("");
    setPartnerId("");
    setMissing("");
    setSortBy(initialResult.filters.sortBy);
    setSortDir(initialResult.filters.sortDir);
    void loadMonitoring({
      month: period.month,
      year: period.year,
      page: 1,
      sortBy: initialResult.filters.sortBy,
      sortDir: initialResult.filters.sortDir,
    });
  };

  const yearOptions = getPeriodYearOptions();
  const maxMonth = getMaxMonthForYear(year);

  const { summary } = result;

  return (
    <PageCard>
      <PageHeader
        title="Dizlee - Invoices"
        description={
          fromDashboard
            ? "Missing Dizlee → OpCo and Partner → Dizlee invoices for each OpCo–Partner pair. From dashboard."
            : "Missing Dizlee → OpCo and Partner → Dizlee invoices for each OpCo–Partner pair."
        }
      />

      <InvoicesTabs active="monitoring" />

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="OpCo–Partner pairs" value={summary.linkedLanes} />
        <KpiCard label="OpCo invoices missing" value={summary.opcoMissing} />
        <KpiCard label="Partner invoices missing" value={summary.partnerMissing} />
        <KpiCard label="Invoices submitted" value={summary.invoicesSubmitted} />
      </div>

      <FilterToolbar className="mt-4">
        <div className="grid w-full gap-4 sm:grid-cols-2 lg:grid-cols-5">
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
            <select value={opcoId} onChange={(event) => setOpcoId(event.target.value)} className={ui.select}>
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
            <select value={partnerId} onChange={(event) => setPartnerId(event.target.value)} className={ui.select}>
              <option value="">All Partners</option>
              {filterOptions.partners.map((partner) => (
                <option key={partner.id} value={partner.id}>
                  {partner.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className={ui.label}>Show</span>
            <select
              value={missing}
              onChange={(event) =>
                setMissing(event.target.value as InvoiceMissingSideFilter | "")
              }
              className={ui.select}
            >
              <option value="">All pairs</option>
              <option value="opco">Missing OpCo invoices</option>
              <option value="partner">Missing Partner invoices</option>
              <option value="any">Any missing invoice</option>
            </select>
          </label>
        </div>
        <div className="flex w-full gap-3">
          <Button variant="secondary" onClick={clearFilters}>
            Clear filters
          </Button>
        </div>
      </FilterToolbar>

      {error ? <div className={`mt-4 ${ui.alertError}`}>{error}</div> : null}

      {!error ? (
        <LoadingOverlay active={loading} className="mt-6 min-h-[12rem]">
        {result.items.length > 0 ? (
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
                      <DataTableTh>Dizlee → OpCo</DataTableTh>
                      <DataTableTh>Partner → Dizlee</DataTableTh>
                    </tr>
                </DataTableHead>
                <tbody>
                  {result.items.map((row) => (
                    <DataTableRow key={row.laneKey}>
                      <DataTableTd className="text-foreground-muted">
                        {formatPeriod(row.period.month, row.period.year)}
                      </DataTableTd>
                      <DataTableTd>{row.opcoName}</DataTableTd>
                      <DataTableTd>{row.partnerName}</DataTableTd>
                      <DataTableTd>
                        <StatusPill tone={invoiceStatusTone(row.opcoInvoice.status)}>
                          {row.opcoInvoice.status}
                        </StatusPill>
                        <p className="mt-1 text-xs text-foreground-subtle">
                          {formatDateTime(row.opcoInvoice.invoicedAt)}
                        </p>
                      </DataTableTd>
                      <DataTableTd>
                        <StatusPill tone={invoiceStatusTone(row.partnerInvoice.status)}>
                          {row.partnerInvoice.status}
                        </StatusPill>
                        <p className="mt-1 text-xs text-foreground-subtle">
                          {formatDateTime(row.partnerInvoice.invoicedAt)}
                        </p>
                        {row.partnerInvoice.invoiceId ? (
                          <Link
                            href={`/dizlee/invoices?month=${row.period.month}&year=${row.period.year}&opcoId=${row.opcoId}&partnerId=${row.partnerId}`}
                            className={`mt-1 inline-flex ${ui.iconButton}`}
                            aria-label="View invoice"
                            title="View invoice"
                          >
                            <IconEye />
                          </Link>
                        ) : null}
                      </DataTableTd>
                    </DataTableRow>
                  ))}
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
            title="No pairs match filters"
            description={
              summary.linkedLanes === 0
                ? "No OpCo–Partner links are configured for this scope."
                : "Try adjusting filters or select a different period."
            }
          />
        )}
        </LoadingOverlay>
      ) : null}
    </PageCard>
  );
}

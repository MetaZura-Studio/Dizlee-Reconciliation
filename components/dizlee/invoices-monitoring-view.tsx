"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { KpiCard } from "@/components/dizlee/kpi-card";
import { InvoicesTabs } from "@/components/dizlee/invoices-tabs";
import type { InvoiceFilterOptions } from "@/lib/dizlee/invoices";
import type {
  InvoiceMissingSideFilter,
  InvoiceMonitoringFilters,
  InvoiceMonitoringResult,
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

function statusClass(status: "Invoiced" | "Missing"): string {
  return status === "Invoiced" ? "text-success" : "text-warning";
}

function buildQuery(filters: InvoiceMonitoringFilters): string {
  const params = new URLSearchParams({
    month: String(filters.month),
    year: String(filters.year),
    page: String(filters.page),
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
    });
  }, [month, year, opcoId, partnerId, missing, loadMonitoring]);

  const goToPage = (nextPage: number) => {
    void loadMonitoring({
      month,
      year,
      opcoId: opcoId || undefined,
      partnerId: partnerId || undefined,
      missing: missing || undefined,
      page: nextPage,
    });
  };

  const yearOptions = [];
  for (let value = year + 1; value >= year - 4; value -= 1) {
    yearOptions.push(value);
  }

  const { summary } = result;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Dizlee - Invoices</h1>
        <p className="mt-1 text-sm text-foreground-muted">
          Missing Dizlee → OpCo and Partner → Dizlee invoices for each OpCo–Partner pair.
        </p>
        {fromDashboard ? (
          <p className="mt-1 text-xs text-foreground-subtle">From dashboard</p>
        ) : null}
      </div>

      <InvoicesTabs active="monitoring" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="OpCo–Partner pairs" value={summary.linkedLanes} />
        <KpiCard label="OpCo invoices missing" value={summary.opcoMissing} />
        <KpiCard label="Partner invoices missing" value={summary.partnerMissing} />
        <KpiCard label="Invoices submitted" value={summary.invoicesSubmitted} />
      </div>

      <section className="rounded-lg border border-border bg-surface-muted p-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <label className="text-sm">
            <span className="mb-1 block text-xs text-foreground-subtle">Period (month)</span>
            <select
              value={month}
              onChange={(event) => setMonth(Number(event.target.value))}
              className="w-full rounded-md border border-border-strong px-3 py-1.5 text-sm"
            >
              {MONTHS.map((name, index) => (
                <option key={name} value={index + 1}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs text-foreground-subtle">Year</span>
            <select
              value={year}
              onChange={(event) => setYear(Number(event.target.value))}
              className="w-full rounded-md border border-border-strong px-3 py-1.5 text-sm"
            >
              {yearOptions.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs text-foreground-subtle">OpCo</span>
            <select
              value={opcoId}
              onChange={(event) => setOpcoId(event.target.value)}
              className="w-full rounded-md border border-border-strong px-3 py-1.5 text-sm"
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
            <span className="mb-1 block text-xs text-foreground-subtle">Partner</span>
            <select
              value={partnerId}
              onChange={(event) => setPartnerId(event.target.value)}
              className="w-full rounded-md border border-border-strong px-3 py-1.5 text-sm"
            >
              <option value="">All Partners</option>
              {filterOptions.partners.map((partner) => (
                <option key={partner.id} value={partner.id}>
                  {partner.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs text-foreground-subtle">Show</span>
            <select
              value={missing}
              onChange={(event) =>
                setMissing(event.target.value as InvoiceMissingSideFilter | "")
              }
              className="w-full rounded-md border border-border-strong px-3 py-1.5 text-sm"
            >
              <option value="">All pairs</option>
              <option value="opco">Missing OpCo invoices</option>
              <option value="partner">Missing Partner invoices</option>
              <option value="any">Any missing invoice</option>
            </select>
          </label>
        </div>
      </section>

      {loading ? (
        <p className="text-sm text-foreground-subtle">Loading invoice monitoring…</p>
      ) : null}
      {error ? (
        <div className="rounded-md border border-danger-border bg-danger-muted p-4 text-sm text-danger">
          {error}
        </div>
      ) : null}

      {!loading && !error ? (
        result.items.length > 0 ? (
          <>
            <div className="overflow-hidden rounded-lg border border-border">
              <table className="min-w-full divide-y divide-border text-sm">
                <thead className="bg-surface-muted">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-foreground-muted">
                      Period
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-foreground-muted">
                      OpCo
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-foreground-muted">
                      Partner
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-foreground-muted">
                      Dizlee → OpCo
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-foreground-muted">
                      Partner → Dizlee
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-surface">
                  {result.items.map((row) => (
                    <tr key={row.laneKey}>
                      <td className="px-4 py-3 text-foreground-muted">
                        {formatPeriod(row.period.month, row.period.year)}
                      </td>
                      <td className="px-4 py-3 text-foreground">{row.opcoName}</td>
                      <td className="px-4 py-3 text-foreground">{row.partnerName}</td>
                      <td className="px-4 py-3">
                        <p className={statusClass(row.opcoInvoice.status)}>
                          {row.opcoInvoice.status}
                        </p>
                        <p className="text-xs text-foreground-subtle">
                          {formatDateTime(row.opcoInvoice.invoicedAt)}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className={statusClass(row.partnerInvoice.status)}>
                          {row.partnerInvoice.status}
                        </p>
                        <p className="text-xs text-foreground-subtle">
                          {formatDateTime(row.partnerInvoice.invoicedAt)}
                        </p>
                        {row.partnerInvoice.invoiceId ? (
                          <Link
                            href={`/dizlee/invoices?month=${row.period.month}&year=${row.period.year}&opcoId=${row.opcoId}&partnerId=${row.partnerId}`}
                            className="text-xs text-foreground-muted underline hover:text-foreground"
                          >
                            View invoice
                          </Link>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between text-sm text-foreground-muted">
              <p>
                Page {result.page} / {result.totalPages} · Total{" "}
                {result.totalCount} records
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={result.page <= 1}
                  onClick={() => goToPage(result.page - 1)}
                  className="rounded-md border border-border-strong px-3 py-1 disabled:opacity-40"
                >
                  Prev
                </button>
                <button
                  type="button"
                  disabled={result.page >= result.totalPages}
                  onClick={() => goToPage(result.page + 1)}
                  className="rounded-md border border-border-strong px-3 py-1 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="rounded-lg border border-border bg-surface p-8 text-center">
            <p className="font-medium text-foreground">No pairs match filters</p>
            <p className="mt-1 text-sm text-foreground-muted">
              {summary.linkedLanes === 0
                ? "No OpCo–Partner links are configured for this scope."
                : "Try adjusting filters or select a different period."}
            </p>
          </div>
        )
      ) : null}
    </div>
  );
}

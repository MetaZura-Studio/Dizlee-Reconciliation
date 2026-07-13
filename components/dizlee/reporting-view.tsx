"use client";

import Link from "next/link";
import { useCallback, useState } from "react";

import { KpiCard } from "@/components/dizlee/kpi-card";
import type { ReportFilterOptions } from "@/lib/dizlee/reports";
import type {
  ReportingLaneStatus,
  ReportingOverview,
} from "@/lib/dizlee/reporting";

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

const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function formatDateTime(value: string | null): string {
  if (!value) {
    return "—";
  }
  return new Date(value).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function statusClass(status: ReportingLaneStatus): string {
  switch (status) {
    case "Complete":
      return "text-success";
    case "Partial":
      return "text-warning";
    case "Missing":
      return "text-danger";
    default:
      return "text-foreground-muted";
  }
}

function boolLabel(value: boolean): string {
  return value ? "Yes" : "No";
}

function boolClass(value: boolean): string {
  return value ? "text-success" : "text-warning";
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

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/dizlee/reporting?${buildQuery(month, year, opcoId, partnerId)}`,
      );
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to load reporting");
      }
      setOverview(payload.data as ReportingOverview);
      setFilterOptions(payload.filterOptions as ReportFilterOptions);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Failed to load reporting",
      );
    } finally {
      setLoading(false);
    }
  }, [month, opcoId, partnerId, year]);

  const yearOptions = [];
  for (let value = year + 1; value >= year - 4; value -= 1) {
    yearOptions.push(value);
  }

  const { summary } = overview;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Reporting</h1>
        <p className="mt-1 text-sm text-foreground-subtle">
          Period overview for reports, invoices, reconciliation, and consolidation.
        </p>
      </div>

      {error ? (
        <div className="rounded-lg border border-danger-border bg-danger-muted px-4 py-3 text-sm text-danger">
          {error}
        </div>
      ) : null}

      <div className="rounded-xl border border-border bg-surface p-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block text-sm">
            <span className="text-foreground-muted">Month</span>
            <select
              value={month}
              onChange={(event) => setMonth(Number(event.target.value))}
              className="mt-1 w-full rounded-lg border border-border-strong px-3 py-2"
            >
              {MONTHS.map((label, index) => (
                <option key={label} value={index + 1}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="text-foreground-muted">Year</span>
            <select
              value={year}
              onChange={(event) => setYear(Number(event.target.value))}
              className="mt-1 w-full rounded-lg border border-border-strong px-3 py-2"
            >
              {yearOptions.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="text-foreground-muted">OpCo</span>
            <select
              value={opcoId}
              onChange={(event) => setOpcoId(event.target.value)}
              className="mt-1 w-full rounded-lg border border-border-strong px-3 py-2"
            >
              <option value="">All</option>
              {filterOptions.opcos.map((opco) => (
                <option key={opco.id} value={opco.id}>
                  {opco.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="text-foreground-muted">Partner</span>
            <select
              value={partnerId}
              onChange={(event) => setPartnerId(event.target.value)}
              className="mt-1 w-full rounded-lg border border-border-strong px-3 py-2"
            >
              <option value="">All</option>
              {filterOptions.partners.map((partner) => (
                <option key={partner.id} value={partner.id}>
                  {partner.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <button
          type="button"
          onClick={() => void loadOverview()}
          disabled={loading}
          className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          Apply filters
        </button>
      </div>

      <p className="text-sm text-foreground-muted">
        Showing <span className="font-medium">{overview.period.label}</span>
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="OpCo–Partner pairs" value={String(summary.linkedLanes)} />
        <KpiCard
          label="Reports complete"
          value={`${summary.reportsComplete} / ${summary.linkedLanes}`}
        />
        <KpiCard
          label="Invoices complete"
          value={`${summary.invoicesComplete} / ${summary.linkedLanes}`}
        />
        <KpiCard
          label="Reconciliations run"
          value={String(summary.reconciliationsRun)}
        />
        <KpiCard
          label="Consolidations"
          value={String(summary.consolidationsGenerated)}
        />
        <KpiCard label="Invoices" value={String(summary.invoiceCount)} />
        <KpiCard label="Invoices paid" value={String(summary.invoicesPaid)} />
        <KpiCard
          label="Revenue paid (USD)"
          value={usdFormatter.format(summary.totalRevenuePaidUsd)}
        />
      </div>

      <div className="flex flex-wrap gap-3 text-sm">
        <Link
          href={`/dizlee/reports?month=${month}&year=${year}`}
          className="font-medium text-foreground-muted underline"
        >
          Reports
        </Link>
        <Link
          href={`/dizlee/invoices?month=${month}&year=${year}`}
          className="font-medium text-foreground-muted underline"
        >
          Invoices
        </Link>
        <Link
          href={`/dizlee/reconciliation?month=${month}&year=${year}`}
          className="font-medium text-foreground-muted underline"
        >
          Reconciliation
        </Link>
        <Link
          href={`/dizlee/consolidation?month=${month}&year=${year}`}
          className="font-medium text-foreground-muted underline"
        >
          Consolidation
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <div className="border-b border-border px-4 py-3">
          <h2 className="font-medium text-foreground">OpCo–Partner overview</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-border bg-surface-muted text-foreground-subtle">
              <tr>
                <th className="px-4 py-3 font-medium">OpCo / Partner</th>
                <th className="px-4 py-3 font-medium">OpCo report</th>
                <th className="px-4 py-3 font-medium">Partner report</th>
                <th className="px-4 py-3 font-medium">OpCo invoice</th>
                <th className="px-4 py-3 font-medium">Partner invoice</th>
                <th className="px-4 py-3 font-medium">Reconciliation</th>
                <th className="px-4 py-3 font-medium">Overall</th>
              </tr>
            </thead>
            <tbody>
              {overview.lanes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-foreground-subtle">
                    No OpCo–Partner pairs match the selected filters.
                  </td>
                </tr>
              ) : (
                overview.lanes.map((lane) => (
                  <tr key={lane.laneKey} className="border-b border-border">
                    <td className="px-4 py-3 text-foreground">
                      {lane.opcoName} / {lane.partnerName}
                    </td>
                    <td className={`px-4 py-3 ${boolClass(lane.opcoReport)}`}>
                      {boolLabel(lane.opcoReport)}
                    </td>
                    <td className={`px-4 py-3 ${boolClass(lane.partnerReport)}`}>
                      {boolLabel(lane.partnerReport)}
                    </td>
                    <td className={`px-4 py-3 ${boolClass(lane.opcoInvoice)}`}>
                      {boolLabel(lane.opcoInvoice)}
                    </td>
                    <td className={`px-4 py-3 ${boolClass(lane.partnerInvoice)}`}>
                      {boolLabel(lane.partnerInvoice)}
                    </td>
                    <td className="px-4 py-3 text-foreground-muted">
                      {lane.reconciliationStatus ?? "—"}
                    </td>
                    <td className={`px-4 py-3 font-medium ${statusClass(lane.overallStatus)}`}>
                      {lane.overallStatus}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <div className="border-b border-border px-4 py-3">
          <h2 className="font-medium text-foreground">Consolidation by OpCo</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-border bg-surface-muted text-foreground-subtle">
              <tr>
                <th className="px-4 py-3 font-medium">OpCo</th>
                <th className="px-4 py-3 font-medium">Generated</th>
                <th className="px-4 py-3 font-medium">Generated at</th>
                <th className="px-4 py-3 font-medium text-right">Total USD</th>
              </tr>
            </thead>
            <tbody>
              {overview.consolidations.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-foreground-subtle">
                    No OpCos in scope for this period.
                  </td>
                </tr>
              ) : (
                overview.consolidations.map((row) => (
                  <tr key={row.opcoId} className="border-b border-border">
                    <td className="px-4 py-3 text-foreground">{row.opcoName}</td>
                    <td
                      className={`px-4 py-3 ${row.generated ? "text-success" : "text-warning"}`}
                    >
                      {row.generated ? "Yes" : "No"}
                    </td>
                    <td className="px-4 py-3 text-foreground-muted">
                      {formatDateTime(row.generatedAt)}
                    </td>
                    <td className="px-4 py-3 text-right text-foreground-muted">
                      {row.totalAmountUsd !== null
                        ? usdFormatter.format(row.totalAmountUsd)
                        : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

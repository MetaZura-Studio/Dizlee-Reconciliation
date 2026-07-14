"use client";

import Link from "next/link";
import { useCallback, useState } from "react";

import { KpiCard } from "@/components/dizlee/kpi-card";
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
import { FilterToolbar, PageCard, PageHeader } from "@/components/ui/page";
import { StatusPill } from "@/components/ui/status-pill";
import { LoadingBar } from "@/components/ui/loading";
import { ui } from "@/lib/ui/classes";
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

function yesNoTone(value: boolean): "success" | "warning" {
  return value ? "success" : "warning";
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
    <PageCard>
      <PageHeader
        title="Reporting"
        description="Period overview for reports, invoices, reconciliation, and consolidation."
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

          <label className="text-sm">
            <span className={ui.label}>OpCo</span>
            <select
              value={opcoId}
              onChange={(event) => setOpcoId(event.target.value)}
              className={ui.select}
            >
              <option value="">All</option>
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
              <option value="">All</option>
              {filterOptions.partners.map((partner) => (
                <option key={partner.id} value={partner.id}>
                  {partner.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="flex w-full gap-3">
          <Button onClick={() => void loadOverview()} disabled={loading}>
            Apply
          </Button>
          <Button variant="secondary" onClick={() => void loadOverview()} disabled={loading}>
            Refresh
          </Button>
        </div>
      </FilterToolbar>

      {loading ? (
        <div className="mt-4">
          <LoadingBar active />
        </div>
      ) : null}

      <p className="mt-4 text-sm text-foreground-muted">
        Showing <span className="font-medium">{overview.period.label}</span>
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

      <div className="mt-4 flex flex-wrap gap-3 text-sm">
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

      <div className="mt-6 space-y-4">
        <h2 className="font-medium text-foreground">OpCo–Partner overview</h2>
        {overview.lanes.length === 0 ? (
          <EmptyState
            title="No pairs match filters"
            description="No OpCo–Partner pairs match the selected filters."
          />
        ) : (
          <DataTableFrame>
            <DataTable>
              <DataTableHead>
                <tr>
                  <DataTableTh>OpCo / Partner</DataTableTh>
                  <DataTableTh>OpCo report</DataTableTh>
                  <DataTableTh>Partner report</DataTableTh>
                  <DataTableTh>OpCo invoice</DataTableTh>
                  <DataTableTh>Partner invoice</DataTableTh>
                  <DataTableTh>Reconciliation</DataTableTh>
                  <DataTableTh>Overall</DataTableTh>
                </tr>
              </DataTableHead>
              <tbody>
                {overview.lanes.map((lane) => (
                  <DataTableRow key={lane.laneKey}>
                    <DataTableTd>
                      {lane.opcoName} / {lane.partnerName}
                    </DataTableTd>
                    <DataTableTd>
                      <StatusPill tone={yesNoTone(lane.opcoReport)}>
                        {lane.opcoReport ? "Yes" : "No"}
                      </StatusPill>
                    </DataTableTd>
                    <DataTableTd>
                      <StatusPill tone={yesNoTone(lane.partnerReport)}>
                        {lane.partnerReport ? "Yes" : "No"}
                      </StatusPill>
                    </DataTableTd>
                    <DataTableTd>
                      <StatusPill tone={yesNoTone(lane.opcoInvoice)}>
                        {lane.opcoInvoice ? "Yes" : "No"}
                      </StatusPill>
                    </DataTableTd>
                    <DataTableTd>
                      <StatusPill tone={yesNoTone(lane.partnerInvoice)}>
                        {lane.partnerInvoice ? "Yes" : "No"}
                      </StatusPill>
                    </DataTableTd>
                    <DataTableTd className="text-foreground-muted">
                      {lane.reconciliationStatus ?? "—"}
                    </DataTableTd>
                    <DataTableTd>
                      <StatusPill tone={overallStatusTone(lane.overallStatus)}>
                        {lane.overallStatus}
                      </StatusPill>
                    </DataTableTd>
                  </DataTableRow>
                ))}
              </tbody>
            </DataTable>
          </DataTableFrame>
        )}
      </div>

      <div className="mt-8 space-y-4">
        <h2 className="font-medium text-foreground">Consolidation by OpCo</h2>
        {overview.consolidations.length === 0 ? (
          <EmptyState
            title="No OpCos in scope"
            description="No OpCos in scope for this period."
          />
        ) : (
          <DataTableFrame>
            <DataTable>
              <DataTableHead>
                <tr>
                  <DataTableTh>OpCo</DataTableTh>
                  <DataTableTh>Generated</DataTableTh>
                  <DataTableTh>Generated at</DataTableTh>
                  <DataTableTh className="text-right">Total USD</DataTableTh>
                </tr>
              </DataTableHead>
              <tbody>
                {overview.consolidations.map((row) => (
                  <DataTableRow key={row.opcoId}>
                    <DataTableTd>{row.opcoName}</DataTableTd>
                    <DataTableTd>
                      <StatusPill tone={yesNoTone(row.generated)}>
                        {row.generated ? "Yes" : "No"}
                      </StatusPill>
                    </DataTableTd>
                    <DataTableTd className="text-foreground-muted">
                      {formatDateTime(row.generatedAt)}
                    </DataTableTd>
                    <DataTableTd className="text-right text-foreground-muted">
                      {row.totalAmountUsd !== null
                        ? usdFormatter.format(row.totalAmountUsd)
                        : "—"}
                    </DataTableTd>
                  </DataTableRow>
                ))}
              </tbody>
            </DataTable>
          </DataTableFrame>
        )}
      </div>
    </PageCard>
  );
}

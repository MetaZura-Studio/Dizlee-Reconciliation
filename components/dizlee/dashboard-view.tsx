"use client";

import Link from "next/link";
import { useCallback, useState } from "react";

import { DonutChart } from "@/components/dizlee/donut-chart";
import { KpiCard } from "@/components/dizlee/kpi-card";
import {
  DataTable,
  DataTableFrame,
  DataTableHead,
  DataTableRow,
  DataTableTd,
  DataTableTh,
} from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageCard, PageHeader } from "@/components/ui/page";
import type {
  DashboardData,
  DirectionPanel,
  DonutSegment,
} from "@/lib/dizlee/dashboard";
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

function reportsLink(
  month: number,
  year: number,
  options?: { opcoId?: string; partnerId?: string; reportId?: string },
): string {
  const params = new URLSearchParams({
    month: String(month),
    year: String(year),
    from: "dashboard",
  });
  if (options?.opcoId) {
    params.set("opcoId", options.opcoId);
  }
  if (options?.partnerId) {
    params.set("partnerId", options.partnerId);
  }
  if (options?.reportId) {
    params.set("reportId", options.reportId);
  }
  return `/dizlee/reports?${params.toString()}`;
}

function reportsMonitoringLink(
  month: number,
  year: number,
  missing?: "opco" | "partner",
): string {
  const params = new URLSearchParams({
    month: String(month),
    year: String(year),
    from: "dashboard",
  });
  if (missing) {
    params.set("missing", missing);
  }
  return `/dizlee/reports/monitoring?${params.toString()}`;
}

function invoicesLink(
  month: number,
  year: number,
  options?: {
    paymentStatus?: "paid" | "pending";
    opcoId?: string;
    partnerId?: string;
  },
): string {
  const params = new URLSearchParams({
    month: String(month),
    year: String(year),
    from: "dashboard",
  });
  if (options?.paymentStatus) {
    params.set("paymentStatus", options.paymentStatus);
  }
  if (options?.opcoId) {
    params.set("opcoId", options.opcoId);
  }
  if (options?.partnerId) {
    params.set("partnerId", options.partnerId);
  }
  return `/dizlee/invoices?${params.toString()}`;
}

function invoicesMonitoringLink(
  month: number,
  year: number,
  missing?: "opco" | "partner",
): string {
  const params = new URLSearchParams({
    month: String(month),
    year: String(year),
    from: "dashboard",
  });
  if (missing) {
    params.set("missing", missing);
  }
  return `/dizlee/invoices/monitoring?${params.toString()}`;
}

function paymentStatusHref(
  month: number,
  year: number,
  segment: DonutSegment,
): string | undefined {
  const code = (segment.id ?? segment.label).toUpperCase();
  if (code === "PAID") {
    return invoicesLink(month, year, { paymentStatus: "paid" });
  }
  if (code === "UNPAID" || code === "OVERDUE") {
    return invoicesLink(month, year, { paymentStatus: "pending" });
  }
  return invoicesLink(month, year);
}

type DashboardViewProps = {
  initialData: DashboardData;
};

export function DashboardView({ initialData }: DashboardViewProps) {
  const [month, setMonth] = useState(initialData.period.month);
  const [year, setYear] = useState(initialData.period.year);
  const [data, setData] = useState<DashboardData>(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPeriod = useCallback(async (targetMonth: number, targetYear: number) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/dizlee/dashboard?month=${targetMonth}&year=${targetYear}`,
      );
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to load dashboard");
      }
      setData(payload.data as DashboardData);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load dashboard",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const handleMonthChange = (nextMonth: number) => {
    setMonth(nextMonth);
    void loadPeriod(nextMonth, year);
  };

  const handleYearChange = (nextYear: number) => {
    setYear(nextYear);
    void loadPeriod(month, nextYear);
  };

  const yearOptions = [];
  for (let value = year + 1; value >= year - 4; value -= 1) {
    yearOptions.push(value);
  }

  const { billing, reportsRecon, recentUploads } = data;
  const { kpis } = billing;

  return (
    <PageCard>
      <PageHeader
        title="Dizlee Dashboard"
        description="Role-specific dashboard with summary cards/widgets."
        actions={
          <div className="flex items-end gap-3">
            <label className="w-36 text-sm">
              <span className={ui.label}>Month</span>
              <select
                value={month}
                onChange={(event) => handleMonthChange(Number(event.target.value))}
                className={ui.select}
              >
                {MONTHS.map((name, index) => (
                  <option key={name} value={index + 1}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <label className="w-28 text-sm">
              <span className={ui.label}>Year</span>
              <select
                value={year}
                onChange={(event) => handleYearChange(Number(event.target.value))}
                className={ui.select}
              >
                {yearOptions.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
          </div>
        }
      />

      {loading ? (
        <p className="text-sm text-foreground-subtle">Updating dashboard…</p>
      ) : null}
      {error ? <div className={ui.alertError}>{error}</div> : null}

      <div className="space-y-8">
        <BillingSectionView billing={billing} kpis={kpis} month={month} year={year} />

        <ReportsReconSectionView
          reportsRecon={reportsRecon}
          month={month}
          year={year}
        />

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-medium text-foreground">Upload activity</h2>
            <Link
              href={reportsLink(month, year)}
              className="text-sm text-foreground-muted hover:text-foreground"
            >
              View all reports
            </Link>
          </div>
          {recentUploads.length > 0 ? (
            <DataTableFrame>
              <DataTable>
                <DataTableHead>
                  <tr>
                    <DataTableTh>Submitted by</DataTableTh>
                    <DataTableTh>OpCo / Partner</DataTableTh>
                    <DataTableTh>Uploaded</DataTableTh>
                  </tr>
                </DataTableHead>
                <tbody>
                  {recentUploads.map((upload) => (
                    <DataTableRow key={upload.id}>
                      <DataTableTd>
                        <Link
                          href={reportsLink(month, year, { reportId: upload.id })}
                          className="underline decoration-foreground-subtle underline-offset-2 hover:text-foreground hover:decoration-foreground"
                        >
                          {upload.actorRole}
                        </Link>
                      </DataTableTd>
                      <DataTableTd className="text-foreground-muted">
                        <Link
                          href={reportsLink(month, year, { reportId: upload.id })}
                          className="underline decoration-foreground-subtle underline-offset-2 hover:text-foreground hover:decoration-foreground"
                        >
                          {upload.lane}
                        </Link>
                      </DataTableTd>
                      <DataTableTd className="text-foreground-muted">
                        <Link
                          href={reportsLink(month, year, { reportId: upload.id })}
                          className="underline decoration-foreground-subtle underline-offset-2 hover:text-foreground hover:decoration-foreground"
                        >
                          {formatDateTime(upload.uploadedAt)}
                        </Link>
                      </DataTableTd>
                    </DataTableRow>
                  ))}
                </tbody>
              </DataTable>
            </DataTableFrame>
          ) : (
            <EmptyState
              title="No uploads yet"
              description="Report uploads for this period will appear here."
            />
          )}
        </section>
      </div>
    </PageCard>
  );
}

function BillingSectionView({
  billing,
  kpis,
  month,
  year,
}: {
  billing: DashboardData["billing"];
  kpis: DashboardData["billing"]["kpis"];
  month: number;
  year: number;
}) {
  const allInvoicesHref = invoicesLink(month, year);
  const paidInvoicesHref = invoicesLink(month, year, { paymentStatus: "paid" });
  const pendingInvoicesHref = invoicesLink(month, year, {
    paymentStatus: "pending",
  });
  const opcoInvoiceMissingHref = invoicesMonitoringLink(month, year, "opco");
  const partnerInvoiceMissingHref = invoicesMonitoringLink(month, year, "partner");

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-medium text-foreground">Billing & revenue</h2>
          <p className="text-sm text-foreground-subtle">
            Paid OpCo collections on platform; revenue in USD using admin
            exchange rates.
          </p>
        </div>
        <Link
          href={allInvoicesHref}
          className="text-sm text-foreground-muted hover:text-foreground"
        >
          View invoices
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Invoices" value={kpis.invoices} href={allInvoicesHref} />
        <KpiCard
          label="Total revenue (paid OpCos)"
          value={usdFormatter.format(kpis.totalRevenuePaidUsd)}
          href={paidInvoicesHref}
        />
        <KpiCard
          label="Invoices paid"
          value={kpis.invoicesPaid}
          href={paidInvoicesHref}
        />
        <KpiCard
          label="Pending collection"
          value={usdFormatter.format(kpis.pendingCollectionUsd)}
          href={pendingInvoicesHref}
        />
      </div>

      {kpis.missingFxCount > 0 ? (
        <div className={ui.alertWarning}>
          {kpis.missingFxCount} paid invoice(s) lack an FX rate for this period
          and are excluded from the USD total.
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <DonutChart
          title="Revenue by OpCo (paid)"
          segments={billing.revenueByOpco}
          formatValue={(value) => usdFormatter.format(value)}
          getSegmentHref={(segment) =>
            segment.id
              ? invoicesLink(month, year, {
                  paymentStatus: "paid",
                  opcoId: segment.id,
                })
              : undefined
          }
        />
        <DonutChart
          title="Payment status"
          segments={billing.paymentStatus.map((segment) => ({
            ...segment,
            label: segment.label.replaceAll("_", " "),
          }))}
          getSegmentHref={(segment) => paymentStatusHref(month, year, segment)}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <DirectionPanelView
          title="Sent to OpCos"
          panel={billing.sentToOpcos}
          invoicedHref={allInvoicesHref}
          paidHref={paidInvoicesHref}
          missingLabel="OpCos without an invoice"
          missingHref={opcoInvoiceMissingHref}
        />
        <DirectionPanelView
          title="Received from partners"
          panel={billing.receivedFromPartners}
          invoicedHref={allInvoicesHref}
          paidHref={paidInvoicesHref}
          missingLabel="Partners without an invoice"
          missingHref={partnerInvoiceMissingHref}
        />
      </div>
    </section>
  );
}

function DirectionPanelView({
  title,
  panel,
  invoicedHref,
  paidHref,
  missingLabel,
  missingHref,
}: {
  title: string;
  panel: DirectionPanel;
  invoicedHref: string;
  paidHref: string;
  missingLabel: string;
  missingHref: string;
}) {
  return (
    <div className="rounded-[28px] border border-border bg-surface p-4 shadow-[var(--shadow-md)]">
      <p className="text-sm font-medium text-foreground-muted">{title}</p>
      <div className="mt-3 flex gap-6 text-sm">
        <div>
          <p className="text-xs text-foreground-subtle">Invoiced</p>
          <Link
            href={invoicedHref}
            className="text-lg font-semibold text-foreground underline decoration-foreground-subtle underline-offset-2 hover:decoration-foreground"
          >
            {panel.invoiced} / {panel.linked}
          </Link>
        </div>
        <div>
          <p className="text-xs text-foreground-subtle">Paid</p>
          <Link
            href={paidHref}
            className="text-lg font-semibold text-foreground underline decoration-foreground-subtle underline-offset-2 hover:decoration-foreground"
          >
            {panel.paid}
          </Link>
        </div>
      </div>
      {panel.missingNames.length > 0 ? (
        <div className="mt-3 text-sm">
          <Link href={missingHref} className="text-foreground-muted hover:text-foreground">
            {missingLabel} ({panel.missingNames.length})
          </Link>
          <p className="mt-1 truncate text-xs text-foreground-subtle">
            {panel.missingNames.join(", ")}
          </p>
        </div>
      ) : (
        <p className="mt-3 text-xs text-foreground-subtle">All pairs invoiced.</p>
      )}
    </div>
  );
}

function ReportsReconSectionView({
  reportsRecon,
  month,
  year,
}: {
  reportsRecon: DashboardData["reportsRecon"];
  month: number;
  year: number;
}) {
  const reportsHref = reportsLink(month, year);
  const opcoMissingHref = reportsMonitoringLink(month, year, "opco");
  const partnerMissingHref = reportsMonitoringLink(month, year, "partner");

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-medium text-foreground">
            Reports & reconciliation
          </h2>
          <p className="text-sm text-foreground-subtle">
            OpCo and partner report uploads, reconciliation status, and recent
            activity.
          </p>
        </div>
        <div className="text-right text-sm">
          <Link
            href={reportsHref}
            className="text-foreground-muted hover:text-foreground"
          >
            View reports
          </Link>
          <p className="text-xs text-foreground-subtle">
            Latest upload:{" "}
            {reportsRecon.latestUpload ? (
              <Link
                href={reportsHref}
                className="underline decoration-foreground-subtle underline-offset-2 hover:decoration-foreground"
              >
                {formatDateTime(reportsRecon.latestUpload)}
              </Link>
            ) : (
              "—"
            )}
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard
          label="Reports submitted"
          value={reportsRecon.reportsSubmitted}
          href={reportsHref}
          hint="View OpCo / Partner submissions"
        />
        <KpiCard
          label="OpCo reports missing"
          value={reportsRecon.opcoReportsMissing}
          href={opcoMissingHref}
        />
        <KpiCard
          label="Partner reports missing"
          value={reportsRecon.partnerReportsMissing}
          href={partnerMissingHref}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <DonutChart
          title="Reports submitted by OpCo"
          segments={reportsRecon.reportsByOpco}
          getSegmentHref={(segment) =>
            segment.id
              ? reportsLink(month, year, { opcoId: segment.id })
              : undefined
          }
        />
        <DonutChart
          title="Reports submitted by Partner"
          segments={reportsRecon.reportsByPartner}
          getSegmentHref={(segment) =>
            segment.id
              ? reportsLink(month, year, { partnerId: segment.id })
              : undefined
          }
        />
      </div>
    </section>
  );
}

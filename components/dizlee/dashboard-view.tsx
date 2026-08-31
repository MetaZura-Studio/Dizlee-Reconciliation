/**
 * Dizlee operations home with KPI cards, charts, and quick links.
 * Summarizes submission, invoice, and reconciliation status for the selected period.
 */

"use client";

import type { ReactNode } from "react";
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
import { LoadingOverlay } from "@/components/ui/loading";
import { PageCard, PageHeader, PageStack } from "@/components/ui/page";
import type {
  DashboardData,
  DirectionPanel,
  DonutSegment,
} from "@/lib/dizlee/dashboard";
import {
  clampPeriodToPresent,
  getMaxMonthForYear,
  getPeriodYearOptions,
} from "@/lib/platform/period";
import { cn, ui } from "@/lib/ui/classes";
import { formatAppError } from "@/lib/errors/format";
import { formatAppDateTime } from "@/lib/platform/format-datetime";
import { formatUsd } from "@/lib/platform/format-money";

type SectionTone = "billing" | "reports" | "uploads";

const sectionShell: Record<SectionTone, string> = {
  billing: "border-primary/25 bg-gradient-to-br from-[#f5f7ff] to-white",
  reports: "border-success-border bg-gradient-to-br from-[#f2fbf9] to-white",
  uploads: "border-warning-border bg-gradient-to-br from-[#fffaf3] to-white",
};

const sectionAccent: Record<SectionTone, string> = {
  billing: "bg-primary",
  reports: "bg-success",
  uploads: "bg-warning",
};

function DashboardSection({
  tone,
  title,
  description,
  action,
  children,
}: {
  tone: SectionTone;
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-[28px] border p-5 shadow-[var(--shadow-sm)] sm:p-6",
        sectionShell[tone],
      )}
    >
      <div
        className={cn(
          "absolute inset-y-0 left-0 w-1.5",
          sectionAccent[tone],
        )}
        aria-hidden
      />
      <div className="flex flex-wrap items-start justify-between gap-4 pl-2">
        <div className="min-w-0 space-y-1">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            {title}
          </h2>
          {description ? (
            <p className="max-w-2xl text-sm text-foreground-muted">{description}</p>
          ) : null}
        </div>
        {action ? <div className="shrink-0 pl-2">{action}</div> : null}
      </div>
      <div className="mt-5 space-y-4 pl-2">{children}</div>
    </section>
  );
}

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
  const initialPeriod = clampPeriodToPresent(
    initialData.period.year,
    initialData.period.month,
  );
  const [month, setMonth] = useState(initialPeriod.month);
  const [year, setYear] = useState(initialPeriod.year);
  const [data, setData] = useState<DashboardData>(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPeriod = useCallback(async (targetMonth: number, targetYear: number) => {
    const next = clampPeriodToPresent(targetYear, targetMonth);
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/dizlee/dashboard?month=${next.month}&year=${next.year}`,
      );
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(formatAppError(payload, "Failed to load dashboard"));
      }
      setMonth(next.month);
      setYear(next.year);
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
    void loadPeriod(nextMonth, year);
  };

  const handleYearChange = (nextYear: number) => {
    const next = clampPeriodToPresent(nextYear, month);
    void loadPeriod(next.month, next.year);
  };

  const yearOptions = getPeriodYearOptions();
  const maxMonthForYear = getMaxMonthForYear(year);

  const { billing, reportsRecon, recentUploads } = data;
  const { kpis } = billing;

  return (
    <PageCard>
      <PageHeader
        title="Dashboard"
        actions={
          <div className="flex items-end gap-3">
            <label className="w-36 text-sm">
              <span className={ui.label}>Month</span>
              <select
                value={month}
                onChange={(event) => handleMonthChange(Number(event.target.value))}
                className={ui.select}
              >
                {MONTHS.slice(0, maxMonthForYear).map((name, index) => (
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

      {error ? <div className={ui.alertError}>{error}</div> : null}

      <LoadingOverlay active={loading} className="min-h-[12rem]">
      <PageStack className="max-w-none gap-5 sm:gap-6">
        <BillingSectionView billing={billing} kpis={kpis} month={month} year={year} />

        <ReportsReconSectionView
          reportsRecon={reportsRecon}
          month={month}
          year={year}
        />

        <DashboardSection
          tone="uploads"
          title="Upload activity"
          description="Most recent report submissions for this period."
          action={
            <Link
              href={reportsLink(month, year)}
              className="text-sm font-medium text-foreground-muted hover:text-foreground"
            >
              View all reports
            </Link>
          }
        >
          {recentUploads.length > 0 ? (
            <DataTableFrame>
              <DataTable>
                <DataTableHead>
                  <tr>
                    <DataTableTh>Submitted by</DataTableTh>
                    <DataTableTh>OpCo / Partner</DataTableTh>
                    <DataTableTh align="center">Uploaded</DataTableTh>
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
                      <DataTableTd className="text-foreground-muted" align="center">
                        <Link
                          href={reportsLink(month, year, { reportId: upload.id })}
                          className="underline decoration-foreground-subtle underline-offset-2 hover:text-foreground hover:decoration-foreground"
                        >
                          {formatAppDateTime(upload.uploadedAt)}
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
        </DashboardSection>
      </PageStack>
      </LoadingOverlay>
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
    <DashboardSection
      tone="billing"
      title="Billing & revenue"
      description="Paid OpCo collections on platform; revenue in USD using admin exchange rates."
      action={
        <Link
          href={allInvoicesHref}
          className="text-sm font-medium text-foreground-muted hover:text-foreground"
        >
          View invoices
        </Link>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Invoices" value={kpis.invoices} href={allInvoicesHref} tone="blue" />
        <KpiCard
          label="Total revenue (paid OpCos)"
          value={formatUsd(kpis.totalRevenuePaidUsd)}
          href={paidInvoicesHref}
          tone="teal"
        />
        <KpiCard
          label="Invoices paid"
          value={kpis.invoicesPaid}
          href={paidInvoicesHref}
          tone="teal"
        />
        <KpiCard
          label="Pending collection"
          value={formatUsd(kpis.pendingCollectionUsd)}
          href={pendingInvoicesHref}
          tone="amber"
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
          formatValue={(value) => formatUsd(value)}
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
    </DashboardSection>
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
    <div className="rounded-[24px] border border-border/80 bg-white/80 p-4 shadow-[var(--shadow-sm)] backdrop-blur-sm">
      <p className="text-sm font-semibold text-foreground">{title}</p>
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
            className="text-lg font-semibold text-success underline decoration-foreground-subtle underline-offset-2 hover:decoration-foreground"
          >
            {panel.paid}
          </Link>
        </div>
      </div>
      {panel.missingNames.length > 0 ? (
        <div className="mt-3 rounded-2xl border border-warning-border bg-warning-muted p-3 text-sm">
          <Link
            href={missingHref}
            className="font-medium text-warning hover:underline"
          >
            {missingLabel} ({panel.missingNames.length})
          </Link>
          <p className="mt-1 truncate text-xs text-warning/80">
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
    <DashboardSection
      tone="reports"
      title="Reports & reconciliation"
      description="OpCo and partner report uploads, reconciliation status, and recent activity."
      action={
        <div className="text-right text-sm">
          <Link
            href={reportsHref}
            className="font-medium text-foreground-muted hover:text-foreground"
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
                {formatAppDateTime(reportsRecon.latestUpload)}
              </Link>
            ) : (
              "—"
            )}
          </p>
        </div>
      }
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard
          label="Reports submitted"
          value={reportsRecon.reportsSubmitted}
          href={reportsHref}
          hint="View OpCo / Partner submissions"
          tone="purple"
        />
        <KpiCard
          label="OpCo reports missing"
          value={reportsRecon.opcoReportsMissing}
          href={opcoMissingHref}
          tone="amber"
        />
        <KpiCard
          label="Partner reports missing"
          value={reportsRecon.partnerReportsMissing}
          href={partnerMissingHref}
          tone="amber"
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
    </DashboardSection>
  );
}

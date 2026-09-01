/**
 * OpCo home dashboard summarizing report and invoice submission status.
 * Period-aware KPIs and links into detailed tables.
 */

import { PartnerSubmissionsTable } from "@/components/opco/PartnerSubmissionsTable";
import { PeriodSelector } from "@/components/opco/PeriodSelector";
import { EmptyState } from "@/components/ui/empty-state";
import { PageCard, PageHeader } from "@/components/ui/page";
import { StatCard } from "@/components/ui/stat-card";
import { StatusPill } from "@/components/ui/status-pill";
import type { OpcoDashboardData } from "@/lib/opco/queries/dashboard";
import { formatPeriodLabel } from "@/lib/opco/period";
import { formatAppDateTime } from "@/lib/platform/format-datetime";
import { ui } from "@/lib/ui/classes";

type DashboardSummaryProps = {
  data: OpcoDashboardData;
};

function reportsHref(
  year: number,
  month: number,
  status?: string,
): string {
  const params = new URLSearchParams({
    year: String(year),
    month: String(month),
  });
  if (status) {
    params.set("status", status);
  }
  return `/opco/reports?${params.toString()}`;
}

export function DashboardSummary({ data }: DashboardSummaryProps) {
  const dashboardPeriodHref = `/opco?year=${data.year}&month=${data.month}#partner-submissions`;

  return (
    <PageCard>
      <PageHeader
        title="Dashboard"
        description={`${data.opcoName} — partner submission summary for ${formatPeriodLabel(data.year, data.month)}`}
      />

      <PeriodSelector year={data.year} month={data.month} />

      <div className="mt-6 grid items-stretch gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Submitted"
          value={data.submittedCount}
          hint={`${data.linkedPartners} linked partners`}
          tone="teal"
          href={reportsHref(data.year, data.month, "SUBMITTED")}
        />
        <StatCard
          label="Not submitted"
          value={data.missingCount}
          tone="amber"
          href={dashboardPeriodHref}
        />
        <StatCard
          label="Change requested"
          value={data.changeRequestedCount}
          tone="purple"
          href={reportsHref(data.year, data.month, "CHANGE_REQUESTED")}
        />
        <StatCard
          label="Invoices to acknowledge"
          value={data.invoicesPendingAck}
          tone="blue"
          href="/opco/invoices?status=SENT"
        />
      </div>

      <section id="partner-submissions" className="mt-6 scroll-mt-6">
        <h2 className="mb-4 text-sm font-semibold text-foreground">
          Partner submissions
        </h2>
        {data.partnerSummaries.length === 0 ? (
          <EmptyState
            title="No partners linked"
            description="No partners are linked to this OpCo yet."
          />
        ) : (
          <PartnerSubmissionsTable partners={data.partnerSummaries} />
        )}
      </section>

      <section className="mt-6">
        <h2 className="mb-4 text-sm font-semibold text-foreground">Recent uploads</h2>
        {data.recentUploads.length === 0 ? (
          <EmptyState
            title="No uploads yet"
            description="No reports uploaded yet for this OpCo."
          />
        ) : (
          <div className={ui.cardPadding}>
            <ul className="divide-y divide-border">
              {data.recentUploads.map((upload) => (
                <li
                  key={upload.reportId}
                  className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm first:pt-0 last:pb-0"
                >
                  <div>
                    <p className="font-medium text-foreground">{upload.partnerName}</p>
                    <p className="text-foreground-subtle">
                      {formatPeriodLabel(upload.year, upload.month)}
                    </p>
                  </div>
                  <div className="text-right">
                    <StatusPill tone="neutral">{upload.statusLabel}</StatusPill>
                    <p className="mt-1 text-xs text-foreground-subtle">
                      {formatAppDateTime(upload.uploadedAt)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </PageCard>
  );
}

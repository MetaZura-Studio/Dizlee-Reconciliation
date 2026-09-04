/**
 * OpCo home dashboard summarizing report and invoice submission status.
 * Period-aware KPIs and links into detailed tables.
 */

import { DashboardRecentUploads } from "@/components/opco/dashboard-recent-uploads";
import { PartnerSubmissionsTable } from "@/components/opco/PartnerSubmissionsTable";
import { PeriodSelector } from "@/components/opco/PeriodSelector";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterToolbar, PageCard, PageHeader } from "@/components/ui/page";
import { StatCard } from "@/components/ui/stat-card";
import type { OpcoDashboardData } from "@/lib/opco/queries/dashboard";
import { formatPeriodLabel } from "@/lib/opco/period";

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

      <FilterToolbar className="mt-4">
        <PeriodSelector year={data.year} month={data.month} />
      </FilterToolbar>

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
        <DashboardRecentUploads items={data.recentUploads} />
      </section>
    </PageCard>
  );
}

/**
 * Partner home dashboard with submission KPIs for reports and invoices.
 * Period selector drives summary metrics and deep links.
 */

import { DashboardRecentUploads } from "@/components/partner/dashboard-recent-uploads";
import { OpcoSubmissionsTable } from "@/components/partner/OpcoSubmissionsTable";
import { PeriodSelector } from "@/components/partner/PeriodSelector";
import { EmptyState } from "@/components/ui/empty-state";
import { PageCard, PageHeader } from "@/components/ui/page";
import { StatCard } from "@/components/ui/stat-card";
import type { PartnerDashboardData } from "@/lib/partner/queries/dashboard";
import { formatPeriodLabel } from "@/lib/partner/period";

type DashboardSummaryProps = {
  data: PartnerDashboardData;
};

function reportsHref(year: number, month: number, status?: string): string {
  const params = new URLSearchParams({
    year: String(year),
    month: String(month),
  });
  if (status) {
    params.set("status", status);
  }
  return `/partner/reports?${params.toString()}`;
}

function invoicesHref(year: number, month: number, hasInvoice: boolean): string {
  if (!hasInvoice) {
    return "/partner/invoices/upload";
  }
  const params = new URLSearchParams({
    year: String(year),
    month: String(month),
  });
  return `/partner/invoices?${params.toString()}`;
}

export function DashboardSummary({ data }: DashboardSummaryProps) {
  return (
    <PageCard>
      <PageHeader
        title="Dashboard"
        description={`${data.partnerName} — OpCo submission summary for ${formatPeriodLabel(data.year, data.month)}`}
        actions={<PeriodSelector year={data.year} month={data.month} />}
      />

      <div className="mt-6 grid items-stretch gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label="Report submitted"
          value={`${data.submittedCount}/${data.linkedOpcos}`}
          hint={`${data.linkedOpcos} linked OpCos`}
          tone="teal"
          href={reportsHref(data.year, data.month, "SUBMITTED")}
        />
        <StatCard
          label="Change requested"
          value={data.changeRequestedCount}
          tone="purple"
          href={reportsHref(data.year, data.month, "CHANGE_REQUESTED")}
        />
        <StatCard
          label="Period invoice"
          value={data.periodInvoiceUploaded ? "Uploaded" : "Missing"}
          hint="Partner → client invoice for this month"
          tone="blue"
          href={invoicesHref(data.year, data.month, data.periodInvoiceUploaded)}
        />
      </div>

      <section id="opco-submissions" className="mt-6 scroll-mt-6">
        <h2 className="mb-4 text-sm font-semibold text-foreground">
          OpCo submissions
        </h2>
        {data.opcoSummaries.length === 0 ? (
          <EmptyState
            title="No OpCos linked"
            description="No OpCos are linked to this partner yet."
          />
        ) : (
          <OpcoSubmissionsTable opcos={data.opcoSummaries} />
        )}
      </section>

      <section className="mt-6">
        <h2 className="mb-4 text-sm font-semibold text-foreground">
          Recent uploads
        </h2>
        <DashboardRecentUploads items={data.recentUploads} />
      </section>
    </PageCard>
  );
}

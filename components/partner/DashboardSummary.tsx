import { OpcoSubmissionsTable } from "@/components/partner/OpcoSubmissionsTable";
import { PeriodSelector } from "@/components/partner/PeriodSelector";
import { EmptyState } from "@/components/ui/empty-state";
import { PageCard, PageHeader } from "@/components/ui/page";
import { StatCard } from "@/components/ui/stat-card";
import { StatusPill } from "@/components/ui/status-pill";
import type { PartnerDashboardData } from "@/lib/partner/queries/dashboard";
import { formatPeriodLabel } from "@/lib/partner/period";
import { ui } from "@/lib/ui/classes";

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

function invoicesHref(year: number, month: number): string {
  const params = new URLSearchParams({
    year: String(year),
    month: String(month),
  });
  return `/partner/invoices?${params.toString()}`;
}

export function DashboardSummary({ data }: DashboardSummaryProps) {
  const dashboardPeriodHref = `/partner?year=${data.year}&month=${data.month}#opco-submissions`;

  return (
    <PageCard>
      <PageHeader
        title="Dashboard"
        description={`${data.partnerName} — OpCo submission summary for ${formatPeriodLabel(data.year, data.month)}`}
      />

      <PeriodSelector year={data.year} month={data.month} />

      <div className="mt-6 grid items-stretch gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Submitted"
          value={data.submittedCount}
          hint={`${data.linkedOpcos} linked OpCos`}
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
          label="Invoices not uploaded"
          value={data.invoicesNotUploaded}
          tone="blue"
          href={invoicesHref(data.year, data.month)}
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
        {data.recentUploads.length === 0 ? (
          <EmptyState
            title="No uploads yet"
            description="No reports uploaded yet for this partner."
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
                    <p className="font-medium text-foreground">
                      {upload.opcoName}
                    </p>
                    <p className="text-foreground-subtle">
                      {formatPeriodLabel(upload.year, upload.month)}
                    </p>
                  </div>
                  <div className="text-right">
                    <StatusPill tone="neutral">{upload.statusLabel}</StatusPill>
                    <p className="mt-1 text-xs text-foreground-subtle">
                      {new Date(upload.uploadedAt).toLocaleString()}
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

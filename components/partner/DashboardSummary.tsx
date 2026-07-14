import Link from "next/link";

import { PeriodSelector } from "@/components/partner/PeriodSelector";
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
import { StatCard } from "@/components/ui/stat-card";
import { StatusPill } from "@/components/ui/status-pill";
import type {
  OpcoSubmissionStatus,
  PartnerDashboardData,
} from "@/lib/partner/queries/dashboard";
import { formatPeriodLabel } from "@/lib/partner/period";
import { submissionStatusTone } from "@/lib/ui/status-tones";
import { ui } from "@/lib/ui/classes";

type DashboardSummaryProps = {
  data: PartnerDashboardData;
};

const STATUS_LABELS: Record<OpcoSubmissionStatus, string> = {
  submitted: "Submitted",
  missing: "Not submitted",
  change_requested: "Change requested",
  pending: "Pending",
};

export function DashboardSummary({ data }: DashboardSummaryProps) {
  return (
    <PageCard>
      <PageHeader
        title="Dashboard"
        description={`${data.partnerName} — OpCo submission summary for ${formatPeriodLabel(data.year, data.month)}`}
        actions={
          <>
            <Link href="/partner/upload" className={ui.btnPrimary}>
              Upload Report
            </Link>
            <Link href="/partner/reports" className={ui.btnSecondary}>
              Reports
            </Link>
          </>
        }
      />

      <PeriodSelector year={data.year} month={data.month} />

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Submitted"
          value={data.submittedCount}
          hint={`${data.linkedOpcos} linked OpCos`}
          tone="teal"
        />
        <StatCard label="Not submitted" value={data.missingCount} tone="amber" />
        <StatCard
          label="Change requested"
          value={data.changeRequestedCount}
          tone="purple"
        />
        <StatCard
          label="Invoices not uploaded"
          value={data.invoicesNotUploaded}
          tone="blue"
        />
      </div>

      <section className="mt-6">
        <h2 className="mb-4 text-sm font-semibold text-foreground">OpCo submissions</h2>
        {data.opcoSummaries.length === 0 ? (
          <EmptyState
            title="No OpCos linked"
            description="No OpCos are linked to this partner yet."
          />
        ) : (
          <DataTableFrame>
            <DataTable>
              <DataTableHead>
                <tr>
                  <DataTableTh>OpCo</DataTableTh>
                  <DataTableTh>Status</DataTableTh>
                  <DataTableTh>Report status</DataTableTh>
                  <DataTableTh>Last upload</DataTableTh>
                </tr>
              </DataTableHead>
              <tbody>
                {data.opcoSummaries.map((opco) => (
                  <DataTableRow key={opco.opcoId}>
                    <DataTableTd className="font-medium text-foreground">
                      {opco.opcoName}
                    </DataTableTd>
                    <DataTableTd>
                      <StatusPill tone={submissionStatusTone(opco.status)}>
                        {STATUS_LABELS[opco.status]}
                      </StatusPill>
                    </DataTableTd>
                    <DataTableTd className="text-foreground-muted">
                      {opco.statusLabel ? (
                        <StatusPill tone="neutral">{opco.statusLabel}</StatusPill>
                      ) : (
                        "—"
                      )}
                    </DataTableTd>
                    <DataTableTd className="text-foreground-muted">
                      {opco.uploadedAt
                        ? new Date(opco.uploadedAt).toLocaleString()
                        : "—"}
                    </DataTableTd>
                  </DataTableRow>
                ))}
              </tbody>
            </DataTable>
          </DataTableFrame>
        )}
      </section>

      <section className="mt-6">
        <h2 className="mb-4 text-sm font-semibold text-foreground">Recent uploads</h2>
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
                    <p className="font-medium text-foreground">{upload.opcoName}</p>
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

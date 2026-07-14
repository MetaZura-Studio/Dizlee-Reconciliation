import Link from "next/link";

import { PeriodSelector } from "@/components/opco/PeriodSelector";
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
import type { OpcoDashboardData, PartnerSubmissionStatus } from "@/lib/opco/queries/dashboard";
import { formatPeriodLabel } from "@/lib/opco/period";
import { submissionStatusTone } from "@/lib/ui/status-tones";
import { ui } from "@/lib/ui/classes";

type DashboardSummaryProps = {
  data: OpcoDashboardData;
};

const STATUS_LABELS: Record<PartnerSubmissionStatus, string> = {
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
        description={`${data.opcoName} — partner submission summary for ${formatPeriodLabel(data.year, data.month)}`}
        actions={
          <>
            <Link href="/opco/upload" className={ui.btnPrimary}>
              Upload Report
            </Link>
            <Link href="/opco/reports" className={ui.btnSecondary}>
              Reports history
            </Link>
          </>
        }
      />

      <PeriodSelector year={data.year} month={data.month} />

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Submitted"
          value={data.submittedCount}
          hint={`${data.linkedPartners} linked partners`}
          tone="teal"
        />
        <StatCard label="Not submitted" value={data.missingCount} tone="amber" />
        <StatCard
          label="Change requested"
          value={data.changeRequestedCount}
          tone="purple"
        />
        <StatCard
          label="Invoices to acknowledge"
          value={data.invoicesPendingAck}
          tone="blue"
        />
      </div>

      <section className="mt-6">
        <h2 className="mb-4 text-sm font-semibold text-foreground">
          Partner submissions
        </h2>
        {data.partnerSummaries.length === 0 ? (
          <EmptyState
            title="No partners linked"
            description="No partners are linked to this OpCo yet."
          />
        ) : (
          <DataTableFrame>
            <DataTable>
              <DataTableHead>
                <tr>
                  <DataTableTh>Partner</DataTableTh>
                  <DataTableTh>Status</DataTableTh>
                  <DataTableTh>Report status</DataTableTh>
                  <DataTableTh>Last upload</DataTableTh>
                </tr>
              </DataTableHead>
              <tbody>
                {data.partnerSummaries.map((partner) => (
                  <DataTableRow key={partner.partnerId}>
                    <DataTableTd className="font-medium text-foreground">
                      {partner.partnerName}
                    </DataTableTd>
                    <DataTableTd>
                      <StatusPill tone={submissionStatusTone(partner.status)}>
                        {STATUS_LABELS[partner.status]}
                      </StatusPill>
                    </DataTableTd>
                    <DataTableTd className="text-foreground-muted">
                      {partner.statusLabel ? (
                        <StatusPill tone="neutral">{partner.statusLabel}</StatusPill>
                      ) : (
                        "—"
                      )}
                    </DataTableTd>
                    <DataTableTd className="text-foreground-muted">
                      {partner.uploadedAt
                        ? new Date(partner.uploadedAt).toLocaleString()
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

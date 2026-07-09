import Link from "next/link";

import { PeriodSelector } from "@/components/partner/PeriodSelector";
import type {
  OpcoSubmissionStatus,
  PartnerDashboardData,
} from "@/lib/partner/queries/dashboard";
import { formatPeriodLabel } from "@/lib/partner/period";

type DashboardSummaryProps = {
  data: PartnerDashboardData;
};

const STATUS_LABELS: Record<OpcoSubmissionStatus, string> = {
  submitted: "Submitted",
  missing: "Not submitted",
  change_requested: "Change requested",
  pending: "Pending",
};

const STATUS_CLASSES: Record<OpcoSubmissionStatus, string> = {
  submitted: "bg-success-muted text-success",
  missing: "bg-rose-50 text-rose-700",
  change_requested: "bg-warning-muted text-warning",
  pending: "bg-surface-muted text-foreground-muted",
};

function SummaryCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: number;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <p className="text-sm text-foreground-subtle">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-foreground">{value}</p>
      {hint ? <p className="mt-1 text-xs text-foreground-subtle">{hint}</p> : null}
    </div>
  );
}

export function DashboardSummary({ data }: DashboardSummaryProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="mt-1 text-foreground-muted">
            {data.partnerName} — OpCo submission summary for{" "}
            {formatPeriodLabel(data.year, data.month)}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/partner/upload"
            className="rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
          >
            Upload Report
          </Link>
          <Link
            href="/partner/reports"
            className="rounded border border-border-strong px-4 py-2 text-sm font-medium text-foreground-muted hover:bg-surface-muted"
          >
            Reports
          </Link>
        </div>
      </div>

      <PeriodSelector year={data.year} month={data.month} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Submitted"
          value={data.submittedCount}
          hint={`${data.linkedOpcos} linked OpCos`}
        />
        <SummaryCard label="Not submitted" value={data.missingCount} />
        <SummaryCard label="Change requested" value={data.changeRequestedCount} />
        <SummaryCard
          label="Invoices not uploaded"
          value={data.invoicesNotUploaded}
        />
      </div>

      <section className="rounded-lg border border-border bg-surface">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-foreground">
            OpCo submissions
          </h2>
        </div>
        {data.opcoSummaries.length === 0 ? (
          <p className="px-4 py-6 text-sm text-foreground-subtle">
            No OpCos are linked to this partner yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-surface-muted text-left text-foreground-subtle">
                <tr>
                  <th className="px-4 py-3 font-medium">OpCo</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Report status</th>
                  <th className="px-4 py-3 font-medium">Last upload</th>
                </tr>
              </thead>
              <tbody>
                {data.opcoSummaries.map((opco) => (
                  <tr key={opco.opcoId} className="border-t border-border">
                    <td className="px-4 py-3 font-medium text-foreground">
                      {opco.opcoName}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_CLASSES[opco.status]}`}
                      >
                        {STATUS_LABELS[opco.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-foreground-muted">
                      {opco.statusLabel ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-foreground-muted">
                      {opco.uploadedAt
                        ? new Date(opco.uploadedAt).toLocaleString()
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-lg border border-border bg-surface">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-foreground">Recent uploads</h2>
        </div>
        {data.recentUploads.length === 0 ? (
          <p className="px-4 py-6 text-sm text-foreground-subtle">
            No reports uploaded yet for this partner.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {data.recentUploads.map((upload) => (
              <li
                key={upload.reportId}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
              >
                <div>
                  <p className="font-medium text-foreground">{upload.opcoName}</p>
                  <p className="text-foreground-subtle">
                    {formatPeriodLabel(upload.year, upload.month)}
                  </p>
                </div>
                <div className="text-right text-foreground-muted">
                  <p>{upload.statusLabel}</p>
                  <p className="text-xs text-foreground-subtle">
                    {new Date(upload.uploadedAt).toLocaleString()}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

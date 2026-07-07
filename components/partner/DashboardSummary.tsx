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
  submitted: "bg-emerald-50 text-emerald-700",
  missing: "bg-rose-50 text-rose-700",
  change_requested: "bg-amber-50 text-amber-700",
  pending: "bg-zinc-100 text-zinc-700",
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
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <p className="text-sm text-zinc-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-zinc-900">{value}</p>
      {hint ? <p className="mt-1 text-xs text-zinc-500">{hint}</p> : null}
    </div>
  );
}

export function DashboardSummary({ data }: DashboardSummaryProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="mt-1 text-zinc-600">
            {data.partnerName} — OpCo submission summary for{" "}
            {formatPeriodLabel(data.year, data.month)}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/partner/upload"
            className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          >
            Upload Report
          </Link>
          <Link
            href="/partner/reports"
            className="rounded border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
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

      <section className="rounded-lg border border-zinc-200 bg-white">
        <div className="border-b border-zinc-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-zinc-900">
            OpCo submissions
          </h2>
        </div>
        {data.opcoSummaries.length === 0 ? (
          <p className="px-4 py-6 text-sm text-zinc-500">
            No OpCos are linked to this partner yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-zinc-50 text-left text-zinc-500">
                <tr>
                  <th className="px-4 py-3 font-medium">OpCo</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Report status</th>
                  <th className="px-4 py-3 font-medium">Last upload</th>
                </tr>
              </thead>
              <tbody>
                {data.opcoSummaries.map((opco) => (
                  <tr key={opco.opcoId} className="border-t border-zinc-100">
                    <td className="px-4 py-3 font-medium text-zinc-900">
                      {opco.opcoName}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_CLASSES[opco.status]}`}
                      >
                        {STATUS_LABELS[opco.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-600">
                      {opco.statusLabel ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-zinc-600">
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

      <section className="rounded-lg border border-zinc-200 bg-white">
        <div className="border-b border-zinc-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-zinc-900">Recent uploads</h2>
        </div>
        {data.recentUploads.length === 0 ? (
          <p className="px-4 py-6 text-sm text-zinc-500">
            No reports uploaded yet for this partner.
          </p>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {data.recentUploads.map((upload) => (
              <li
                key={upload.reportId}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
              >
                <div>
                  <p className="font-medium text-zinc-900">{upload.opcoName}</p>
                  <p className="text-zinc-500">
                    {formatPeriodLabel(upload.year, upload.month)}
                  </p>
                </div>
                <div className="text-right text-zinc-600">
                  <p>{upload.statusLabel}</p>
                  <p className="text-xs text-zinc-500">
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

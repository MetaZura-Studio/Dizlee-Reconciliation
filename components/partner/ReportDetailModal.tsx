"use client";

import type { PartnerReportDetail } from "@/lib/partner/queries/reports";

function formatBytes(size: number | null): string {
  if (size === null) {
    return "—";
  }
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

type ReportDetailModalProps = {
  detail: PartnerReportDetail | null;
  loading: boolean;
  onClose: () => void;
};

export function ReportDetailModal({
  detail,
  loading,
  onClose,
}: ReportDetailModalProps) {
  if (!detail && !loading) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-lg bg-surface shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-detail-title"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-4">
          <div>
            <h2 id="report-detail-title" className="text-lg font-semibold text-foreground">
              Report details
            </h2>
            {detail ? (
              <p className="mt-1 text-sm text-foreground-muted">
                {detail.opcoName} — {detail.periodLabel}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-foreground-subtle hover:text-foreground"
          >
            Close
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-4">
          {loading ? (
            <p className="text-sm text-foreground-subtle">Loading report details…</p>
          ) : detail ? (
            <div className="space-y-6">
              <dl className="grid gap-4 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-foreground-subtle">Status</dt>
                  <dd className="font-medium text-foreground">{detail.statusLabel}</dd>
                </div>
                <div>
                  <dt className="text-foreground-subtle">Uploaded</dt>
                  <dd className="font-medium text-foreground">
                    {formatDateTime(detail.uploadedAt)}
                  </dd>
                </div>
                <div>
                  <dt className="text-foreground-subtle">File</dt>
                  <dd className="font-medium text-foreground">{detail.filename ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-foreground-subtle">File size</dt>
                  <dd className="font-medium text-foreground">
                    {formatBytes(detail.fileSizeBytes)}
                  </dd>
                </div>
                <div>
                  <dt className="text-foreground-subtle">Line items</dt>
                  <dd className="font-medium text-foreground">{detail.lineItemCount}</dd>
                </div>
              </dl>

              <div>
                <h3 className="text-sm font-semibold text-foreground">Line items</h3>
                <div className="mt-3 overflow-x-auto rounded-lg border border-border">
                  <table className="min-w-full divide-y divide-border text-sm">
                    <thead className="bg-surface-muted text-left text-foreground-muted">
                      <tr>
                        <th className="px-3 py-2 font-medium">#</th>
                        <th className="px-3 py-2 font-medium">Description</th>
                        <th className="px-3 py-2 font-medium">Usage</th>
                        <th className="px-3 py-2 font-medium">USD</th>
                        <th className="px-3 py-2 font-medium">Amount</th>
                        <th className="px-3 py-2 font-medium">Rate</th>
                        <th className="px-3 py-2 font-medium">Unit</th>
                        <th className="px-3 py-2 font-medium">Basis</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {detail.lineItems.map((item) => (
                        <tr key={item.lineNumber}>
                          <td className="px-3 py-2 text-foreground-subtle">{item.lineNumber}</td>
                          <td className="px-3 py-2 text-foreground">
                            {item.description ?? "—"}
                          </td>
                          <td className="px-3 py-2 text-foreground-muted">
                            {item.usageAmount ?? "—"}
                          </td>
                          <td className="px-3 py-2 text-foreground-muted">{item.usageUsd ?? "—"}</td>
                          <td className="px-3 py-2 text-foreground-muted">{item.amount ?? "—"}</td>
                          <td className="px-3 py-2 text-foreground-muted">
                            {item.exchangeRate ?? "—"}
                          </td>
                          <td className="px-3 py-2 text-foreground-muted">{item.usageUnit ?? "—"}</td>
                          <td className="px-3 py-2 text-foreground-muted">
                            {item.reconciliationBasis ?? "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

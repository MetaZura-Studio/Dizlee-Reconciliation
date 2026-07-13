"use client";

import { ReportLineItemsTable } from "@/components/shared/report-line-items-table";
import type { ReportDetail } from "@/lib/dizlee/reports";

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
  detail: ReportDetail | null;
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
        className="flex max-h-[90vh] w-full max-w-5xl flex-col rounded-lg bg-surface shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-detail-title"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-4">
          <h2 id="report-detail-title" className="text-lg font-semibold text-foreground">
            Report details
          </h2>
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
                  <dt className="text-foreground-subtle">Period</dt>
                  <dd className="font-medium text-foreground">{detail.period.label}</dd>
                </div>
                <div>
                  <dt className="text-foreground-subtle">OpCo / Partner</dt>
                  <dd className="font-medium text-foreground">{detail.lane}</dd>
                </div>
                <div>
                  <dt className="text-foreground-subtle">Uploaded by</dt>
                  <dd className="font-medium text-foreground">{detail.uploadedBy}</dd>
                </div>
                <div>
                  <dt className="text-foreground-subtle">Upload timestamp</dt>
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
                  <dt className="text-foreground-subtle">Status</dt>
                  <dd className="font-medium text-foreground">{detail.status}</dd>
                </div>
                <div>
                  <dt className="text-foreground-subtle">Line items</dt>
                  <dd className="font-medium text-foreground">{detail.lineItemCount}</dd>
                </div>
              </dl>

              <div>
                <h3 className="text-sm font-semibold text-foreground">Report data</h3>
                <div className="mt-3">
                  <ReportLineItemsTable lineItems={detail.lineItems} />
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

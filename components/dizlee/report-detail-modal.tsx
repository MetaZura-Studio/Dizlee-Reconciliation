"use client";

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
        className="w-full max-w-lg rounded-lg bg-surface p-6 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-detail-title"
      >
        <div className="flex items-start justify-between gap-4">
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

        {loading ? (
          <p className="mt-4 text-sm text-foreground-subtle">Loading report details…</p>
        ) : detail ? (
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-foreground-subtle">Period</dt>
              <dd className="font-medium text-foreground">{detail.period.label}</dd>
            </div>
            <div>
              <dt className="text-foreground-subtle">OpCo / Partner lane</dt>
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
              <dd className="font-medium text-foreground">
                {detail.filename ?? "—"}
                {detail.previewUrl ? (
                  <>
                    {" "}
                    <a
                      href={detail.previewUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-foreground-muted underline hover:text-foreground"
                    >
                      Preview
                    </a>
                  </>
                ) : null}
              </dd>
            </div>
            <div>
              <dt className="text-foreground-subtle">File size</dt>
              <dd className="font-medium text-foreground">
                {formatBytes(detail.fileSizeBytes)}
              </dd>
            </div>
          </dl>
        ) : null}
      </div>
    </div>
  );
}

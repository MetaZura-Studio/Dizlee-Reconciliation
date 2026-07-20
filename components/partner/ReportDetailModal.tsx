"use client";

import { ReportLineItemsTable } from "@/components/shared/report-line-items-table";
import { ReportFilenameLink } from "@/components/shared/report-filename-link";
import { ModalCloseButton } from "@/components/ui/modal-close-button";
import type { PartnerReportDetail } from "@/lib/partner/queries/reports";
import { reportRawFilePreviewUrl } from "@/lib/platform/reports/preview-url";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]">
      <div
        className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[28px] border border-border bg-surface shadow-[var(--shadow-md)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-detail-title"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-8 py-5">
          <div>
            <h2 id="report-detail-title" className="text-lg font-semibold text-foreground">
              Parsed report data
            </h2>
            {detail ? (
              <p className="mt-1 text-sm text-foreground-muted">
                {detail.opcoName} — {detail.periodLabel}
              </p>
            ) : null}
          </div>
          <ModalCloseButton onClick={onClose} />
        </div>

        <div className="overflow-y-auto px-8 py-6">
          {loading ? (
            <p className="text-sm text-foreground-subtle">Loading report details…</p>
          ) : detail ? (
            <div className="space-y-8">
              <dl className="grid gap-5 text-sm sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <dt className="text-foreground-subtle">Status</dt>
                  <dd className="mt-1 font-medium text-foreground">{detail.statusLabel}</dd>
                </div>
                <div>
                  <dt className="text-foreground-subtle">Uploaded</dt>
                  <dd className="mt-1 font-medium text-foreground">
                    {formatDateTime(detail.uploadedAt)}
                  </dd>
                </div>
                <div>
                  <dt className="text-foreground-subtle">Original file</dt>
                  <dd className="mt-1 font-medium text-foreground">
                    <ReportFilenameLink
                      filename={detail.filename}
                      href={
                        detail.filename
                          ? reportRawFilePreviewUrl("partner", detail.id)
                          : undefined
                      }
                    />
                  </dd>
                </div>
                <div>
                  <dt className="text-foreground-subtle">File size</dt>
                  <dd className="mt-1 font-medium text-foreground">
                    {formatBytes(detail.fileSizeBytes)}
                  </dd>
                </div>
                <div>
                  <dt className="text-foreground-subtle">Line items</dt>
                  <dd className="mt-1 font-medium text-foreground">{detail.lineItemCount}</dd>
                </div>
              </dl>

              <div>
                <h3 className="text-sm font-semibold text-foreground">Parsed line items</h3>
                <div className="mt-4">
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

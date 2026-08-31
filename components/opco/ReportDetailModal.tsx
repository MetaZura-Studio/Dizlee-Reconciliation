"use client";

import { formatAppDateTime } from "@/lib/platform/format-datetime";
import { ReportLineItemsTable } from "@/components/shared/report-line-items-table";
import { ReportFilenameLink } from "@/components/shared/report-filename-link";
import { ModalCloseButton } from "@/components/ui/modal-close-button";
import type { OpcoReportDetail } from "@/lib/opco/queries/reports";
import { reportRawFilePreviewUrl } from "@/lib/platform/reports/preview-url";
import {
  reportPreviewBackdropClass,
  reportPreviewDetailBodyClass,
  reportPreviewDetailShellClasses,
  reportPreviewTableFitClass,
} from "@/lib/ui/report-preview-modal";

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

type ReportDetailModalProps = {
  detail: OpcoReportDetail | null;
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
    <div className={reportPreviewBackdropClass}>
      <div
        className={reportPreviewDetailShellClasses(loading || !detail ? null : 4)}
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-detail-title"
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border px-5 py-3 sm:px-8 sm:py-5">
          <div>
            <h2 id="report-detail-title" className="text-lg font-semibold text-foreground">
              Parsed report data
            </h2>
            {detail ? (
              <p className="mt-1 text-sm text-foreground-muted">
                {detail.partnerName} — {detail.periodLabel}
              </p>
            ) : null}
          </div>
          <ModalCloseButton onClick={onClose} />
        </div>

        <div className={`${reportPreviewDetailBodyClass} sm:px-8 sm:py-6`}>
          {loading ? (
            <p className="text-sm text-foreground-subtle">Loading report details…</p>
          ) : detail ? (
            <div className="flex flex-col gap-6">
              <dl className="grid shrink-0 gap-5 text-sm sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <dt className="text-foreground-subtle">Status</dt>
                  <dd className="mt-1 font-medium text-foreground">{detail.statusLabel}</dd>
                </div>
                <div>
                  <dt className="text-foreground-subtle">Uploaded</dt>
                  <dd className="mt-1 font-medium text-foreground">
                    {formatAppDateTime(detail.uploadedAt)}
                  </dd>
                </div>
                <div>
                  <dt className="text-foreground-subtle">Original file</dt>
                  <dd className="mt-1 font-medium text-foreground">
                    <ReportFilenameLink
                      filename={detail.filename}
                      href={
                        detail.filename
                          ? reportRawFilePreviewUrl("opco", detail.id)
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

              <div className="flex flex-col">
                <h3 className="shrink-0 text-sm font-semibold text-foreground">
                  Parsed line items
                </h3>
                <div className={`mt-3 ${reportPreviewTableFitClass} p-1`}>
                  <ReportLineItemsTable
                    lineItems={detail.lineItems}
                    currencyCode={detail.currencyCode}
                    side="opco"
                  />
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

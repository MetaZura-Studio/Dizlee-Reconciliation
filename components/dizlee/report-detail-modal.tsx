"use client";

import { formatAppDateTime } from "@/lib/platform/format-datetime";
import { ReportLineItemsTable } from "@/components/shared/report-line-items-table";
import { Modal } from "@/components/ui/modal";
import { ReportFilenameLink } from "@/components/shared/report-filename-link";
import type { ReportDetail } from "@/lib/dizlee/reports";
import {
  reportPreviewShellWidthClass,
  reportPreviewTableFitClass,
} from "@/lib/ui/report-preview-modal";
import { cn } from "@/lib/ui/classes";

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
    <Modal
      open={!!detail || loading}
      title="Parsed report data"
      onClose={onClose}
      wide
      className={cn(
        "ml-6 flex max-h-[84vh] w-full flex-col overflow-hidden px-6 pt-6 pb-0 sm:ml-10 sm:max-h-[82vh]",
        reportPreviewShellWidthClass(
          loading || !detail ? null : detail.side === "partner" ? 3 : 4,
        ),
      )}
    >
      {loading ? (
        <p className="px-6 pb-6 text-sm text-foreground-subtle">Loading report details…</p>
      ) : detail ? (
        <div className="flex flex-col overflow-y-auto px-6 pb-6">
          <dl className="grid shrink-0 gap-4 text-sm sm:grid-cols-2">
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
                {formatAppDateTime(detail.uploadedAt)}
              </dd>
            </div>
            <div>
              <dt className="text-foreground-subtle">Original file</dt>
              <dd className="font-medium text-foreground">
                <ReportFilenameLink
                  filename={detail.filename}
                  href={detail.previewUrl ?? undefined}
                />
              </dd>
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

          <div className="mt-4 flex flex-col">
            <h3 className="shrink-0 text-sm font-semibold text-foreground">
              Parsed report data
            </h3>
            <div className={`mt-3 ${reportPreviewTableFitClass} p-1`}>
              <ReportLineItemsTable
                lineItems={detail.lineItems}
                currencyCode={detail.currencyCode}
                side={detail.side}
              />
            </div>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}

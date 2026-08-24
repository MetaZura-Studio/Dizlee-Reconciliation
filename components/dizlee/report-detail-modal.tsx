"use client";

import { ReportLineItemsTable } from "@/components/shared/report-line-items-table";
import { Modal } from "@/components/ui/modal";
import { ReportFilenameLink } from "@/components/shared/report-filename-link";
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
    <Modal
      open={!!detail || loading}
      title="Parsed report data"
      onClose={onClose}
      wide
      className="max-w-6xl"
    >
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

          <div>
            <h3 className="text-sm font-semibold text-foreground">Parsed report data</h3>
            <div className="mt-3">
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

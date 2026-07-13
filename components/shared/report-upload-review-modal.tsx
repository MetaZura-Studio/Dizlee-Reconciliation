import { ReportLineItemsTable } from "@/components/shared/report-line-items-table";
import type { ReportPreviewLineItem } from "@/lib/platform/report-preview";

type ReportUploadReviewModalProps = {
  filename: string;
  subtitle?: string;
  lineItems: ReportPreviewLineItem[];
  confirming: boolean;
  onReupload: () => void;
  onConfirm: () => void;
  onClose: () => void;
};

export function ReportUploadReviewModal({
  filename,
  subtitle,
  lineItems,
  confirming,
  onReupload,
  onConfirm,
  onClose,
}: ReportUploadReviewModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        className="flex max-h-[90vh] w-full max-w-5xl flex-col rounded-lg bg-surface shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-upload-review-title"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-4">
          <div>
            <h2
              id="report-upload-review-title"
              className="text-lg font-semibold text-foreground"
            >
              Confirm report upload
            </h2>
            <p className="mt-1 text-sm text-foreground-muted">
              Review the parsed data for <span className="font-medium">{filename}</span>{" "}
              before submitting.
            </p>
            {subtitle ? (
              <p className="mt-1 text-sm text-foreground-subtle">{subtitle}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={confirming}
            className="text-sm text-foreground-subtle hover:text-foreground disabled:opacity-60"
          >
            Close
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-4">
          <p className="mb-3 text-sm text-foreground-muted">
            {lineItems.length} line item{lineItems.length === 1 ? "" : "s"}
          </p>
          <ReportLineItemsTable lineItems={lineItems} />
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-border px-6 py-4">
          <button
            type="button"
            onClick={onReupload}
            disabled={confirming}
            className="rounded border border-border-strong px-4 py-2 text-sm font-medium text-foreground-muted hover:bg-surface-muted disabled:opacity-60"
          >
            Reupload
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={confirming}
            className="rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-60"
          >
            {confirming ? "Uploading..." : "Confirm upload"}
          </button>
        </div>
      </div>
    </div>
  );
}

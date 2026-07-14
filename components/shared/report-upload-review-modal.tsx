"use client";

import { useEffect } from "react";

import { ReportLineItemsTable } from "@/components/shared/report-line-items-table";
import { Button } from "@/components/ui/button";
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
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !confirming) {
        onClose();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [confirming, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]">
      <div
        className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-[28px] border border-border bg-surface shadow-[var(--shadow-md)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-upload-review-title"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-4">
          <div>
            <h2
              id="report-upload-review-title"
              className="text-lg font-semibold tracking-tight text-foreground"
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
          <Button variant="secondary" onClick={onReupload} disabled={confirming}>
            Reupload
          </Button>
          <Button onClick={onConfirm} disabled={confirming}>
            {confirming ? "Uploading..." : "Confirm upload"}
          </Button>
        </div>
      </div>
    </div>
  );
}

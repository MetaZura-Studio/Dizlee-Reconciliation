"use client";

import { useRef, useState } from "react";

import { ReportUploadReviewModal } from "@/components/shared/report-upload-review-modal";
import { formatPeriodLabel } from "@/lib/partner/period";
import type { PartnerReportListItem } from "@/lib/partner/queries/reports";
import type { ReportPreviewLineItem } from "@/lib/platform/report-preview";

type ReportReuploadDialogProps = {
  report: PartnerReportListItem;
  onClose: () => void;
  onSuccess: () => void;
};

type ReviewState = {
  filename: string;
  lineItems: ReportPreviewLineItem[];
};

export function ReportReuploadDialog({
  report,
  onClose,
  onSuccess,
}: ReportReuploadDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [review, setReview] = useState<ReviewState | null>(null);

  async function parseSelectedFile(selectedFile: File) {
    setError(null);
    setReview(null);
    setFile(selectedFile);
    setIsParsing(true);

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const response = await fetch("/api/partner/reports/parse-preview", {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json()) as {
        error?: string;
        filename?: string;
        lineItems?: ReportPreviewLineItem[];
      };

      if (!response.ok) {
        setError(payload.error ?? "Failed to parse report");
        setFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        return;
      }

      setReview({
        filename: payload.filename ?? selectedFile.name,
        lineItems: payload.lineItems ?? [],
      });
    } catch {
      setError("Failed to parse report");
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } finally {
      setIsParsing(false);
    }
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0] ?? null;
    if (!selectedFile) {
      setFile(null);
      setReview(null);
      return;
    }
    void parseSelectedFile(selectedFile);
  }

  function handleReupload() {
    setReview(null);
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  }

  async function handleConfirmUpload() {
    if (!file) {
      return;
    }

    setError(null);
    setIsConfirming(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`/api/partner/reports/${report.id}/reupload`, {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(payload.error ?? "Failed to upload corrected report");
        setReview(null);
        return;
      }

      onSuccess();
      onClose();
    } catch {
      setError("Failed to upload corrected report");
      setReview(null);
    } finally {
      setIsConfirming(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div
          className="w-full max-w-lg rounded-lg border border-border bg-surface p-6 shadow-lg"
          role="dialog"
          aria-labelledby="report-reupload-title"
        >
          <h2 id="report-reupload-title" className="text-lg font-semibold text-foreground">
            Reupload corrected file
          </h2>
          <p className="mt-1 text-sm text-foreground-muted">
            {report.opcoName} — {formatPeriodLabel(report.year, report.month)}
          </p>
          <p className="mt-2 text-sm text-foreground-subtle">
            Dizlee approved your reupload request. Select a corrected `.xlsx` file to
            preview and confirm.
          </p>

          <div className="mt-4 space-y-4">
            <div>
              <label
                htmlFor="reupload-file"
                className="block text-sm font-medium text-foreground-muted"
              >
                Corrected Excel file
              </label>
              <input
                ref={fileInputRef}
                id="reupload-file"
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={handleFileChange}
                disabled={isParsing || isConfirming}
                className="mt-1 block w-full text-sm disabled:opacity-60"
              />
              {isParsing ? (
                <p className="mt-2 text-sm text-foreground-muted">Parsing report…</p>
              ) : null}
            </div>

            {error ? (
              <p className="rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
                {error}
              </p>
            ) : null}

            <div className="flex justify-end">
              <button
                type="button"
                onClick={onClose}
                disabled={isParsing || isConfirming}
                className="rounded border border-border-strong px-4 py-2 text-sm font-medium text-foreground-muted hover:bg-surface-muted"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>

      {review ? (
        <ReportUploadReviewModal
          filename={review.filename}
          subtitle={`${report.opcoName} — ${formatPeriodLabel(report.year, report.month)}`}
          lineItems={review.lineItems}
          confirming={isConfirming}
          onReupload={handleReupload}
          onConfirm={() => void handleConfirmUpload()}
          onClose={() => setReview(null)}
        />
      ) : null}
    </>
  );
}

"use client";

import { useRef, useState } from "react";

import { ReportUploadReviewModal } from "@/components/shared/report-upload-review-modal";
import { Button } from "@/components/ui/button";
import { FieldLabel } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { formatPeriodLabel } from "@/lib/partner/period";
import { ui } from "@/lib/ui/classes";
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
      <Modal open title="Reupload corrected file" onClose={onClose}>
        <p className="text-sm text-foreground-muted">
          {report.opcoName} — {formatPeriodLabel(report.year, report.month)}
        </p>
        <p className={`mt-2 ${ui.hint}`}>
          Dizlee approved your reupload request. Select a corrected `.xlsx` file to
          preview and confirm.
        </p>

        <div className="mt-4 space-y-4">
          <div>
            <FieldLabel htmlFor="reupload-file">Corrected Excel file</FieldLabel>
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

          {error ? <p className={ui.alertError}>{error}</p> : null}

          <div className="flex justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isParsing || isConfirming}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

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

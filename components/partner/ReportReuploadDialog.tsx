"use client";

import { useRef, useState } from "react";

import {
  formatFileSizeLabel,
  ReportUploadReviewModal,
} from "@/components/shared/report-upload-review-modal";
import { Button } from "@/components/ui/button";
import { FieldLabel } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { formatPeriodLabel } from "@/lib/partner/period";
import type { PartnerReportListItem } from "@/lib/partner/queries/reports";
import { validateReportUploadFile } from "@/lib/partner/validation/report-upload";
import { readRawExcelSheetPreview } from "@/lib/platform/excel/read-raw-sheet";
import { ui } from "@/lib/ui/classes";
import { formatAppError } from "@/lib/errors/format";

type ReportReuploadDialogProps = {
  report: PartnerReportListItem;
  onClose: () => void;
  onSuccess: () => void;
};

type ReviewState = {
  filename: string;
  fileSizeLabel: string;
  rawRows: string[][];
  sheetName: string;
  totalRows: number;
  truncated: boolean;
};

export function ReportReuploadDialog({
  report,
  onClose,
  onSuccess,
}: ReportReuploadDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [review, setReview] = useState<ReviewState | null>(null);

  async function openRawPreview(selectedFile: File) {
    setError(null);
    setConfirmError(null);
    setReview(null);

    const validationError = validateReportUploadFile(selectedFile);
    if (validationError) {
      setError(validationError);
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    setFile(selectedFile);
    setIsLoadingPreview(true);

    try {
      const buffer = await selectedFile.arrayBuffer();
      const preview = await readRawExcelSheetPreview(buffer);
      setReview({
        filename: selectedFile.name,
        fileSizeLabel: formatFileSizeLabel(selectedFile.size),
        rawRows: preview.rows,
        sheetName: preview.sheetName,
        totalRows: preview.totalRows,
        truncated: preview.truncated,
      });
    } catch {
      setError("Could not read this Excel file. Please choose a valid .xlsx file.");
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } finally {
      setIsLoadingPreview(false);
    }
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0] ?? null;
    if (!selectedFile) {
      setFile(null);
      setReview(null);
      return;
    }
    void openRawPreview(selectedFile);
  }

  function handleReupload() {
    setReview(null);
    setFile(null);
    setConfirmError(null);
    window.setTimeout(() => {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
        fileInputRef.current.click();
      }
    }, 0);
  }

  async function handleConfirmUpload() {
    if (!file) {
      return;
    }

    setConfirmError(null);
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
        setConfirmError(formatAppError(payload, "Failed to upload corrected report"));
        return;
      }

      onSuccess();
      onClose();
    } catch {
      setConfirmError("Failed to upload corrected report");
    } finally {
      setIsConfirming(false);
    }
  }

  return (
    <>
      <Modal open={!review} title="Reupload corrected file" onClose={onClose}>
        <p className="text-sm text-foreground-muted">
          {report.opcoName} — {formatPeriodLabel(report.year, report.month)}
        </p>
        <p className={`mt-2 ${ui.hint}`}>
          Dizlee approved your reupload request. Select a corrected `.xlsx` file to
          preview and confirm.
        </p>

        <div className="mt-4 space-y-4">
          <div>
            <FieldLabel htmlFor="reupload-file" required>
              Corrected Excel file
            </FieldLabel>
            <input
              ref={fileInputRef}
              id="reupload-file"
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={handleFileChange}
              disabled={isLoadingPreview || isConfirming}
              className="mt-1 block w-full text-sm disabled:opacity-60"
            />
            {isLoadingPreview ? (
              <p className="mt-2 text-sm text-foreground-muted">Loading preview…</p>
            ) : null}
          </div>

          {error ? <p className={ui.alertError}>{error}</p> : null}

          <div className="flex justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isLoadingPreview || isConfirming}
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
          side="partner"
          fileSizeLabel={review.fileSizeLabel}
          rawRows={review.rawRows}
          rawSheetName={review.sheetName}
          rawTruncated={review.truncated}
          rawTotalRows={review.totalRows}
          confirming={isConfirming}
          confirmError={confirmError}
          confirmLabel="Confirm reupload"
          confirmingLabel="Reuploading…"
          onReupload={handleReupload}
          onConfirm={() => void handleConfirmUpload()}
          onClose={() => {
            setReview(null);
            setConfirmError(null);
          }}
        />
      ) : null}
    </>
  );
}

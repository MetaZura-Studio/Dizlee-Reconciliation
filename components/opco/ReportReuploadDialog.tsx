"use client";

import { useRef, useState } from "react";

import {
  formatFileSizeLabel,
  ReportUploadReviewModal,
} from "@/components/shared/report-upload-review-modal";
import { Button } from "@/components/ui/button";
import { FieldLabel } from "@/components/ui/field";
import {
  FileDropField,
  type FileDropFieldHandle,
} from "@/components/ui/file-drop-field";
import { LoadingOverlay } from "@/components/ui/loading";
import { Modal } from "@/components/ui/modal";
import { formatPeriodLabel } from "@/lib/opco/period";
import type { OpcoReportListItem } from "@/lib/opco/queries/reports";
import { validateReportUploadFile } from "@/lib/opco/validation/report-upload";
import { readRawExcelSheetPreview } from "@/lib/platform/excel/read-raw-sheet";
import { ui } from "@/lib/ui/classes";
import { formatAppError } from "@/lib/errors/format";

type ReportReuploadDialogProps = {
  report: OpcoReportListItem;
  preferredSheetName?: string | null;
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
  preferredSheetName = null,
  onClose,
  onSuccess,
}: ReportReuploadDialogProps) {
  const fileInputRef = useRef<FileDropFieldHandle>(null);
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
      fileInputRef.current?.clear();
      return;
    }

    setFile(selectedFile);
    setIsLoadingPreview(true);

    try {
      const buffer = await selectedFile.arrayBuffer();
      const preview = await readRawExcelSheetPreview(buffer, preferredSheetName);
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
      fileInputRef.current?.clear();
    } finally {
      setIsLoadingPreview(false);
    }
  }

  function handleFileSelected(selectedFile: File | null) {
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
      fileInputRef.current?.clear();
      fileInputRef.current?.open();
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
      const response = await fetch(`/api/opco/reports/${report.id}/reupload`, {
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
        <LoadingOverlay
          active={isLoadingPreview}
          label="Opening preview…"
          className="min-h-[8rem]"
        >
        <p className="text-sm text-foreground-muted">
          {report.partnerName} — {formatPeriodLabel(report.year, report.month)}
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
            <FileDropField
              ref={fileInputRef}
              id="reupload-file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              emptyLabel="Drop .xlsx here or browse"
              hint="Excel workbook only (.xlsx)"
              value={file}
              onChange={handleFileSelected}
              disabled={isLoadingPreview || isConfirming}
              required
              compact
              className="mt-1.5"
            />
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
        </LoadingOverlay>
      </Modal>

      {review ? (
        <ReportUploadReviewModal
          filename={review.filename}
          subtitle={`${report.partnerName} — ${formatPeriodLabel(report.year, report.month)}`}
          side="opco"
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

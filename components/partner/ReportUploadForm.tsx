/**
 * Upload and validate a partner report before final submission.
 * Uses parse preview to catch template errors early.
 */

"use client";

import Link from "next/link";
import { useRef, useState } from "react";

import {
  formatFileSizeLabel,
  ReportUploadReviewModal,
} from "@/components/shared/report-upload-review-modal";
import { Button } from "@/components/ui/button";
import { FieldLabel, Select } from "@/components/ui/field";
import {
  FormLayout,
  HelpPanel,
  PageSection,
} from "@/components/ui/page";
import { LoadingOverlay, LoadingSpinner } from "@/components/ui/loading";
import type { LinkedOpco } from "@/lib/partner/queries/opcos";
import { getDefaultPeriod } from "@/lib/partner/period";
import { validateReportUploadFile } from "@/lib/partner/validation/report-upload";
import { readRawExcelSheetPreview } from "@/lib/platform/excel/read-raw-sheet";
import {
  getMaxUploadMonthForYear,
  getUploadYearOptions,
} from "@/lib/platform/period";
import { cn, ui } from "@/lib/ui/classes";
import { useToast } from "@/components/ui/toast";
import { formatAppError } from "@/lib/errors/format";

type ReportUploadFormProps = {
  opcos: LinkedOpco[];
};

type UploadSuccess = {
  reportId: string;
  lineItemCount: number;
};

type ReviewState = {
  filename: string;
  fileSizeLabel: string;
  rawRows: string[][];
  sheetName: string;
  totalRows: number;
  truncated: boolean;
};

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function ReportUploadForm({ opcos }: ReportUploadFormProps) {
  const defaultPeriod = getDefaultPeriod();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [opcoId, setOpcoId] = useState(opcos[0]?.id ?? "");
  const [year, setYear] = useState(defaultPeriod.year);
  const [month, setMonth] = useState(defaultPeriod.month);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [success, setSuccess] = useState<UploadSuccess | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [review, setReview] = useState<ReviewState | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const toast = useToast();

  const selectedOpcoName = opcos.find((opco) => opco.id === opcoId)?.name ?? "OpCo";

  const yearOptions = getUploadYearOptions();
  const maxMonth = getMaxUploadMonthForYear(year);
  const monthOptions = MONTHS.slice(0, maxMonth);

  function handleYearChange(nextYear: number) {
    setYear(nextYear);
    const capped = getMaxUploadMonthForYear(nextYear);
    if (month > capped) {
      setMonth(capped);
    }
  }

  async function openRawPreview(selectedFile: File) {
    setError(null);
    setConfirmError(null);
    setSuccess(null);
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
      setConfirmError(null);
      return;
    }
    void openRawPreview(selectedFile);
  }

  function handleChooseFile() {
    fileInputRef.current?.click();
  }

  function handleChooseDifferentFile() {
    setReview(null);
    setConfirmError(null);
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    if (isLoadingPreview || isConfirming) {
      return;
    }
    const selectedFile = event.dataTransfer.files?.[0] ?? null;
    if (selectedFile) {
      void openRawPreview(selectedFile);
    }
  }

  async function handleConfirmUpload() {
    if (!file) {
      return;
    }

    setConfirmError(null);
    setIsConfirming(true);

    const formData = new FormData();
    formData.append("opcoId", opcoId);
    formData.append("year", String(year));
    formData.append("month", String(month));
    formData.append("file", file);

    try {
      const response = await fetch("/api/partner/reports/upload", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json()) as {
        error?: string;
        reportId?: string;
        lineItemCount?: number;
      };

      if (!response.ok) {
        setConfirmError(formatAppError(payload, "Failed to upload report"));
        return;
      }

      setSuccess({
        reportId: payload.reportId ?? "",
        lineItemCount: payload.lineItemCount ?? 0,
      });
      toast.success(
        `Report uploaded successfully with ${payload.lineItemCount ?? 0} line items.`,
      );
      setReview(null);
      setConfirmError(null);
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch {
      setConfirmError("Failed to upload report");
    } finally {
      setIsConfirming(false);
    }
  }

  if (opcos.length === 0) {
    return (
      <div className={ui.alertWarning}>
        No OpCos are linked to your partner yet. Ask an admin to configure
        OpCo–Partner links before uploading reports.
      </div>
    );
  }

  return (
    <>
      <LoadingOverlay
        active={isLoadingPreview}
        label="Opening preview…"
        className="min-h-[12rem]"
      >
      <FormLayout>
        <PageSection
          title="OpCo & period"
          description="Select the OpCo and billing period for this upload."
        >
          <div className="grid max-w-2xl gap-4 sm:grid-cols-3">
            <div>
              <FieldLabel htmlFor="opcoId" required>
                OpCo
              </FieldLabel>
              <Select
                id="opcoId"
                name="opcoId"
                value={opcoId}
                onChange={(event) => setOpcoId(event.target.value)}
                required
              >
                {opcos.map((opco) => (
                  <option key={opco.id} value={opco.id}>
                    {opco.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <FieldLabel htmlFor="month" required>
                Month
              </FieldLabel>
              <Select
                id="month"
                name="month"
                value={month}
                onChange={(event) => setMonth(Number(event.target.value))}
                required
              >
                {monthOptions.map((label, index) => (
                  <option key={label} value={index + 1}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <FieldLabel htmlFor="year" required>
                Year
              </FieldLabel>
              <Select
                id="year"
                name="year"
                value={year}
                onChange={(event) =>
                  handleYearChange(Number(event.target.value))
                }
                required
              >
                {yearOptions.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </PageSection>

        <PageSection
          title="Excel file"
          description="Drop your monthly .xlsx workbook. You will preview the sheet before confirming."
        >
          <input
            ref={fileInputRef}
            id="file"
            name="file"
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={handleFileChange}
            disabled={isLoadingPreview || isConfirming}
            className="sr-only"
          />
          <div
            role="button"
            tabIndex={0}
            onClick={handleChooseFile}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                handleChooseFile();
              }
            }}
            onDragEnter={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={(event) => {
              event.preventDefault();
              setIsDragging(false);
            }}
            onDrop={handleDrop}
            className={cn(
              "relative flex min-h-[11rem] cursor-pointer flex-col items-center justify-center rounded-[22px] border border-dashed px-6 py-8 text-center transition-colors sm:min-h-[12.5rem]",
              isDragging
                ? "border-primary bg-primary-muted/50"
                : "border-border-strong bg-surface hover:border-primary hover:bg-primary-muted/20",
              (isLoadingPreview || isConfirming) &&
                "pointer-events-none opacity-60",
            )}
          >
            {isLoadingPreview ? (
              <>
                <LoadingSpinner />
                <p className="mt-4 text-base font-medium text-foreground">
                  Opening preview…
                </p>
                <p className="mt-1.5 text-sm text-foreground-subtle">
                  Reading your Excel workbook
                </p>
              </>
            ) : (
              <>
            <p className="text-base font-medium text-foreground">
              {file ? file.name : "Drop .xlsx here or browse"}
            </p>
            <p className="mt-1.5 text-sm text-foreground-subtle">
              {file
                ? formatFileSizeLabel(file.size)
                : "Excel workbook only (.xlsx)"}
            </p>
            {!file ? (
              <span className={`mt-5 ${ui.btnSecondary}`}>Choose file</span>
            ) : (
              <Button
                type="button"
                variant="secondary"
                className="mt-5"
                onClick={(event) => {
                  event.stopPropagation();
                  handleChooseDifferentFile();
                }}
              >
                Replace file
              </Button>
            )}
              </>
            )}
          </div>

          {error ? <p className={`mt-4 ${ui.alertError}`}>{error}</p> : null}

          {success ? (
            <div className="mt-4 rounded-[18px] border border-border bg-surface p-4">
              <p className="text-sm font-medium text-foreground">
                Upload complete
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link href="/partner/reports" className={ui.btnSecondary}>
                  View reports history
                </Link>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setSuccess(null);
                    setError(null);
                  }}
                >
                  Upload another
                </Button>
              </div>
            </div>
          ) : null}
        </PageSection>

        <HelpPanel title="Quick tips">
          <ul className="list-disc space-y-1.5 pl-4">
            <li>Use the standard monthly Excel template (.xlsx).</li>
            <li>
              OpCo and period: {selectedOpcoName} — {MONTHS[month - 1]} {year}.
            </li>
            <li>
              Re-uploading the same OpCo and period may create a new version or
              need approval.
            </li>
          </ul>
          <p className="text-xs text-foreground-subtle">
            Need an older file?{" "}
            <Link
              href="/partner/reports"
              className="underline hover:text-foreground"
            >
              Open reports history
            </Link>
            .
          </p>
        </HelpPanel>
      </FormLayout>
      </LoadingOverlay>

      {review ? (
        <ReportUploadReviewModal
          filename={review.filename}
          fileSizeLabel={review.fileSizeLabel}
          subtitle={`${selectedOpcoName} — ${MONTHS[month - 1]} ${year}`}
          side="partner"
          rawRows={review.rawRows}
          rawSheetName={review.sheetName}
          rawTruncated={review.truncated}
          rawTotalRows={review.totalRows}
          confirming={isConfirming}
          confirmError={confirmError}
          onReupload={handleChooseDifferentFile}
          onConfirm={() => void handleConfirmUpload()}
          onClose={() => {
            if (!isConfirming) {
              setReview(null);
              setConfirmError(null);
            }
          }}
        />
      ) : null}
    </>
  );
}

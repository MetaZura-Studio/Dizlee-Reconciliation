"use client";

import Link from "next/link";
import { useRef, useState } from "react";

import {
  formatFileSizeLabel,
  ReportUploadReviewModal,
} from "@/components/shared/report-upload-review-modal";
import { Button } from "@/components/ui/button";
import { FieldLabel, Select } from "@/components/ui/field";
import type { LinkedOpco } from "@/lib/partner/queries/opcos";
import { getDefaultPeriod } from "@/lib/partner/period";
import { validateReportUploadFile } from "@/lib/partner/validation/report-upload";
import { readRawExcelSheetPreview } from "@/lib/platform/excel/read-raw-sheet";
import {
  getMaxUploadMonthForYear,
  getUploadYearOptions,
} from "@/lib/platform/period";
import { cn, ui } from "@/lib/ui/classes";

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
  const [success, setSuccess] = useState<UploadSuccess | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [review, setReview] = useState<ReviewState | null>(null);
  const [isDragging, setIsDragging] = useState(false);

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
      return;
    }
    void openRawPreview(selectedFile);
  }

  function handleChooseFile() {
    fileInputRef.current?.click();
  }

  function handleChooseDifferentFile() {
    setReview(null);
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

    setError(null);
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
        setError(payload.error ?? "Failed to upload report");
        return;
      }

      setSuccess({
        reportId: payload.reportId ?? "",
        lineItemCount: payload.lineItemCount ?? 0,
      });
      setReview(null);
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch {
      setError("Failed to upload report");
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
      <div className="grid gap-8 lg:grid-cols-[minmax(0,28rem)_minmax(0,18rem)] lg:items-start">
        <div className="space-y-5">
          <div>
            <FieldLabel htmlFor="opcoId" required>OpCo</FieldLabel>
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

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor="month" required>Month</FieldLabel>
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
              <FieldLabel htmlFor="year" required>Year</FieldLabel>
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

          <div>
            <FieldLabel required>Excel report (.xlsx)</FieldLabel>
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
                "mt-1.5 flex min-h-[9.5rem] cursor-pointer flex-col items-center justify-center rounded-[22px] border border-dashed px-4 py-6 text-center transition-colors",
                isDragging
                  ? "border-primary bg-primary-muted/50"
                  : "border-border-strong bg-surface-muted/40 hover:border-primary hover:bg-primary-muted/30",
                (isLoadingPreview || isConfirming) && "pointer-events-none opacity-60",
              )}
            >
              <p className="text-sm font-medium text-foreground">
                {isLoadingPreview
                  ? "Opening preview…"
                  : file
                    ? file.name
                    : "Drop .xlsx here or browse"}
              </p>
              <p className="mt-1 text-xs text-foreground-subtle">
                {file
                  ? formatFileSizeLabel(file.size)
                  : "Excel workbook only (.xlsx)"}
              </p>
              {!file ? (
                <span className={`mt-4 ${ui.btnSecondary}`}>Choose file</span>
              ) : (
                <Button
                  type="button"
                  variant="secondary"
                  className="mt-4"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleChooseDifferentFile();
                  }}
                >
                  Replace file
                </Button>
              )}
            </div>
          </div>

          {error ? <p className={ui.alertError}>{error}</p> : null}

          {success ? (
            <div className={ui.alertSuccess}>
              <p>
                Report uploaded successfully with {success.lineItemCount} line
                items.
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
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
        </div>

        <aside className="rounded-[22px] border border-border bg-surface-muted/50 p-4 sm:p-5">
          <h2 className="text-sm font-semibold text-foreground">Before you upload</h2>
          <ul className="mt-3 space-y-2.5 text-sm text-foreground-muted">
            <li>Use the standard monthly Excel template (.xlsx).</li>
            <li>
              Choose the correct OpCo and period (
              {MONTHS[month - 1]} {year}).
            </li>
            <li>You will preview the sheet before confirming upload.</li>
            <li>
              Uploading again for the same OpCo and period may create a new
              version or require reupload approval.
            </li>
          </ul>
          <p className="mt-4 text-xs text-foreground-subtle">
            Need an older file?{" "}
            <Link href="/partner/reports" className="underline hover:text-foreground">
              Open reports history
            </Link>
            .
          </p>
        </aside>
      </div>

      {review ? (
        <ReportUploadReviewModal
          filename={review.filename}
          fileSizeLabel={review.fileSizeLabel}
          subtitle={`${selectedOpcoName} — ${MONTHS[month - 1]} ${year}`}
          rawRows={review.rawRows}
          rawSheetName={review.sheetName}
          rawTruncated={review.truncated}
          rawTotalRows={review.totalRows}
          confirming={isConfirming}
          onReupload={handleChooseDifferentFile}
          onConfirm={() => void handleConfirmUpload()}
          onClose={() => {
            if (!isConfirming) {
              setReview(null);
            }
          }}
        />
      ) : null}
    </>
  );
}

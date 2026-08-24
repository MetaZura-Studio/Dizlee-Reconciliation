/**
 * Upload and validate a new report file for the selected billing period.
 * Runs parse preview before confirming submission to Dizlee.
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
import { Modal } from "@/components/ui/modal";
import type { LinkedPartner } from "@/lib/opco/queries/partners";
import { getDefaultPeriod } from "@/lib/opco/period";
import { validateReportUploadFile } from "@/lib/opco/validation/report-upload";
import {
  notLinkedPartnerDisplayNames,
  parseUnlinkedPartnersDetails,
  type UnlinkedPartnersInFile,
} from "@/lib/opco/unlinked-partners-in-file.shared";
import { readRawExcelSheetPreview } from "@/lib/platform/excel/read-raw-sheet";
import {
  getMaxUploadMonthForYear,
  getUploadYearOptions,
} from "@/lib/platform/period";
import { cn, ui } from "@/lib/ui/classes";
import { useToast } from "@/components/ui/toast";
import { formatAppError } from "@/lib/errors/format";

type ReportUploadFormProps = {
  partners: LinkedPartner[];
  /** When true, Partner is resolved from Excel / Admin maps (no Partner picker). */
  partnerFromServiceMap?: boolean;
  preferredSheetName?: string | null;
};

type UploadSuccess = {
  reportId: string;
  reportIds?: string[];
  lineItemCount: number;
  partnerCount?: number;
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

export function ReportUploadForm({
  partners,
  partnerFromServiceMap = false,
  preferredSheetName = null,
}: ReportUploadFormProps) {
  const defaultPeriod = getDefaultPeriod();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [partnerId, setPartnerId] = useState(partners[0]?.id ?? "");
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
  const [linkRequest, setLinkRequest] = useState<UnlinkedPartnersInFile | null>(
    null,
  );
  const [linkRequestMessage, setLinkRequestMessage] = useState(
    "Please add these OpCo–Partner links so we can upload the report.",
  );
  const [isNotifyingAdmin, setIsNotifyingAdmin] = useState(false);
  const [linkRequestError, setLinkRequestError] = useState<string | null>(null);
  const toast = useToast();

  const selectedPartnerName = partnerFromServiceMap
    ? "Mapped partners"
    : (partners.find((partner) => partner.id === partnerId)?.name ?? "Partner");

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
    setLinkRequest(null);
    setLinkRequestError(null);

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
    if (!partnerFromServiceMap) {
      formData.append("partnerId", partnerId);
    }
    formData.append("year", String(year));
    formData.append("month", String(month));
    formData.append("file", file);

    try {
      const response = await fetch("/api/opco/reports/upload", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json()) as {
        error?: string | { key?: string };
        details?: unknown;
        reportId?: string;
        reportIds?: string[];
        lineItemCount?: number;
        partnerCount?: number;
      };

      if (!response.ok) {
        const unmatched = parseUnlinkedPartnersDetails(payload);
        if (unmatched) {
          setReview(null);
          setLinkRequest(unmatched);
          setLinkRequestMessage(
            "Please add these OpCo–Partner links so we can upload the report.",
          );
          setLinkRequestError(null);
          return;
        }
        setConfirmError(formatAppError(payload, "Failed to upload report"));
        return;
      }

      setSuccess({
        reportId: payload.reportId ?? "",
        reportIds: payload.reportIds,
        lineItemCount: payload.lineItemCount ?? 0,
        partnerCount: payload.partnerCount,
      });
      toast.success(
        partnerFromServiceMap && payload.partnerCount
          ? `Report uploaded for ${payload.partnerCount} partner(s) with ${payload.lineItemCount ?? 0} line items.`
          : `Report uploaded successfully with ${payload.lineItemCount ?? 0} line items.`,
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

  function resetFileSelection() {
    setReview(null);
    setConfirmError(null);
    setLinkRequest(null);
    setLinkRequestError(null);
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function handleNotifyAdmin() {
    if (!linkRequest) {
      return;
    }
    const message = linkRequestMessage.trim();
    if (message.length < 10) {
      setLinkRequestError("Message must be at least 10 characters.");
      return;
    }

    setIsNotifyingAdmin(true);
    setLinkRequestError(null);
    try {
      const response = await fetch("/api/opco/reports/request-partner-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year,
          month,
          message,
          unlinkedPartnerNames: linkRequest.unlinkedPartnerNames,
          unknownPartnerNames: linkRequest.unknownPartnerNames,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setLinkRequestError(
          formatAppError(payload, "Failed to notify Admin"),
        );
        return;
      }
      toast.success(
        "Admin has been notified. You can upload after the link is added.",
      );
      resetFileSelection();
    } catch {
      setLinkRequestError("Failed to notify Admin");
    } finally {
      setIsNotifyingAdmin(false);
    }
  }

  if (partners.length === 0) {
    return (
      <div className={ui.alertWarning}>
        No partners are linked to your OpCo yet. Ask an admin to configure
        OpCo–Partner links before uploading reports.
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,28rem)_minmax(0,18rem)] lg:items-start">
        <div className="space-y-5">
          {partnerFromServiceMap ? (
            <div className={ui.alertWarning}>
              Partner is resolved automatically from the Excel Partner /
              Merchant / Vendor column (or Admin Service–Partner maps for
              Iraq/Sudan). One report is created per Partner found in the file.
            </div>
          ) : (
            <div>
              <FieldLabel htmlFor="partnerId" required>Partner</FieldLabel>
              <Select
                id="partnerId"
                name="partnerId"
                value={partnerId}
                onChange={(event) => setPartnerId(event.target.value)}
                required
              >
                {partners.map((partner) => (
                  <option key={partner.id} value={partner.id}>
                    {partner.name}
                  </option>
                ))}
              </Select>
            </div>
          )}

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
            <div className="rounded-md border border-border bg-surface-muted/50 p-4 text-sm">
              <div className="flex flex-wrap gap-3">
                <Link href="/opco/reports" className={ui.btnSecondary}>
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
              {partnerFromServiceMap
                ? `Choose the correct period (${MONTHS[month - 1]} ${year}). Partners come from the file or Admin mappings.`
                : `Choose the correct partner and period (${MONTHS[month - 1]} ${year}).`}
            </li>
            <li>You will preview the sheet before confirming upload.</li>
            <li>
              Uploading again for the same partner and period may create a new
              version or require reupload approval.
            </li>
          </ul>
          <p className="mt-4 text-xs text-foreground-subtle">
            Need an older file?{" "}
            <Link href="/opco/reports" className="underline hover:text-foreground">
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
          subtitle={`${selectedPartnerName} — ${MONTHS[month - 1]} ${year}`}
          side="opco"
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

      <Modal
        open={Boolean(linkRequest)}
        title="Partners not linked with you"
        onClose={() => {
          if (!isNotifyingAdmin) {
            resetFileSelection();
          }
        }}
        className="max-w-lg"
      >
        <p className="text-sm text-foreground-muted">
          These partners are not linked with you. Notify Admin to add the
          OpCo–Partner links, then you can upload this file.
        </p>
        {linkRequest ? (
          <ul className="mt-4 list-disc pl-5 text-sm text-foreground">
            {notLinkedPartnerDisplayNames(linkRequest).map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
        ) : null}
        <div className="mt-4">
          <FieldLabel htmlFor="linkRequestMessage" required>
            Message to Admin
          </FieldLabel>
          <textarea
            id="linkRequestMessage"
            value={linkRequestMessage}
            onChange={(event) => setLinkRequestMessage(event.target.value)}
            disabled={isNotifyingAdmin}
            rows={4}
            className={`${ui.input} h-auto min-h-[6.5rem] py-2.5`}
          />
        </div>
        {linkRequestError ? (
          <p className={`mt-3 ${ui.alertError}`}>{linkRequestError}</p>
        ) : null}
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={resetFileSelection}
            disabled={isNotifyingAdmin}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void handleNotifyAdmin()}
            disabled={isNotifyingAdmin}
          >
            {isNotifyingAdmin ? "Notifying…" : "Notify Admin"}
          </Button>
        </div>
      </Modal>
    </>
  );
}

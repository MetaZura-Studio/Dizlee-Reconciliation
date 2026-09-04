/**
 * Upload and validate a new report file for the selected billing period.
 * Runs parse preview before confirming submission to Dizlee.
 * Blocks choose-file when a monthly submission already exists; reupload uses
 * the approved submission change-request flow on this page.
 */

"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { SubmissionRequestChangeDialog } from "@/components/opco/submission-request-change-dialog";
import { SubmissionReuploadDialog } from "@/components/opco/submission-reupload-dialog";
import {
  formatFileSizeLabel,
  ReportUploadReviewModal,
} from "@/components/shared/report-upload-review-modal";
import { Button } from "@/components/ui/button";
import { FieldLabel, Select } from "@/components/ui/field";
import { IconButton } from "@/components/ui/icon-button";
import { IconRefresh, IconUpload } from "@/components/ui/icons";
import { Modal } from "@/components/ui/modal";
import {
  FormLayout,
  HelpPanel,
  PageSection,
} from "@/components/ui/page";
import { LoadingOverlay, LoadingSpinner } from "@/components/ui/loading";
import type { LinkedPartner } from "@/lib/opco/queries/partners";
import type { OpcoSubmissionListItem } from "@/lib/opco/queries/submissions";
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

function formatNotifyAdminError(payload: unknown): string {
  if (payload && typeof payload === "object" && "details" in payload) {
    const details = (payload as { details?: unknown }).details;
    if (details && typeof details === "object") {
      for (const value of Object.values(details as Record<string, unknown>)) {
        if (Array.isArray(value) && typeof value[0] === "string" && value[0].trim()) {
          return value[0].trim();
        }
        if (typeof value === "string" && value.trim()) {
          return value.trim();
        }
      }
    }
  }
  return formatAppError(payload, "Failed to notify Admin");
}

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
  const [periodSubmission, setPeriodSubmission] =
    useState<OpcoSubmissionListItem | null>(null);
  const [periodStatusLoading, setPeriodStatusLoading] = useState(true);
  const [periodStatusError, setPeriodStatusError] = useState<string | null>(
    null,
  );
  const [changeRequestSubmission, setChangeRequestSubmission] =
    useState<OpcoSubmissionListItem | null>(null);
  const [reuploadSubmission, setReuploadSubmission] =
    useState<OpcoSubmissionListItem | null>(null);
  const toast = useToast();

  const selectedPartnerName = partnerFromServiceMap
    ? "Mapped partners"
    : (partners.find((partner) => partner.id === partnerId)?.name ?? "Partner");

  const yearOptions = getUploadYearOptions();
  const maxMonth = getMaxUploadMonthForYear(year);
  const monthOptions = MONTHS.slice(0, maxMonth);

  const periodBlocked =
    periodStatusLoading ||
    (periodSubmission != null && !periodSubmission.canReupload);
  /** Initial dropzone is only for first upload; corrected files use reupload dialog. */
  const dropzoneDisabled =
    periodStatusLoading ||
    periodSubmission != null ||
    isLoadingPreview ||
    isConfirming;

  const historyHref = `/opco/reports?year=${year}&month=${month}`;

  const loadPeriodStatus = useCallback(async (nextYear: number, nextMonth: number) => {
    setPeriodStatusLoading(true);
    setPeriodStatusError(null);
    try {
      const response = await fetch(
        `/api/opco/submissions/period?year=${nextYear}&month=${nextMonth}`,
      );
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(
          formatAppError(payload, "Failed to check period submission"),
        );
      }
      setPeriodSubmission(
        (payload.data as OpcoSubmissionListItem | null) ?? null,
      );
    } catch (loadError) {
      setPeriodSubmission(null);
      setPeriodStatusError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to check period submission",
      );
    } finally {
      setPeriodStatusLoading(false);
    }
  }, []);

  useEffect(() => {
    // Defer so setState inside loadPeriodStatus is not synchronous in the effect body
    // (react-hooks/set-state-in-effect).
    const timer = window.setTimeout(() => {
      void loadPeriodStatus(year, month);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [year, month, loadPeriodStatus]);

  function handleYearChange(nextYear: number) {
    setYear(nextYear);
    const capped = getMaxUploadMonthForYear(nextYear);
    if (month > capped) {
      setMonth(capped);
    }
  }

  async function openRawPreview(selectedFile: File) {
    if (periodSubmission != null) {
      return;
    }

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
    if (dropzoneDisabled) {
      return;
    }
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
    if (dropzoneDisabled) {
      return;
    }
    const selectedFile = event.dataTransfer.files?.[0] ?? null;
    if (selectedFile) {
      void openRawPreview(selectedFile);
    }
  }

  async function handleConfirmUpload() {
    if (!file || periodSubmission != null) {
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
      void loadPeriodStatus(year, month);
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
        setLinkRequestError(formatNotifyAdminError(payload));
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
      <LoadingOverlay
        active={isLoadingPreview}
        label="Opening preview…"
        className="min-h-[12rem]"
      >
      <FormLayout>
        <PageSection
          title="Period & partner"
          description={
            partnerFromServiceMap
              ? "Select the billing period. Partners are resolved from the file or Admin maps."
              : "Select the partner and billing period for this upload."
          }
        >
          <div
            className={cn(
              "grid max-w-2xl gap-4",
              partnerFromServiceMap
                ? "sm:grid-cols-2"
                : "sm:grid-cols-3",
            )}
          >
            {!partnerFromServiceMap ? (
              <div className="sm:col-span-1">
                <FieldLabel htmlFor="partnerId" required>
                  Partner
                </FieldLabel>
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
            ) : null}
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
          {partnerFromServiceMap ? (
            <p className="mt-3 text-xs text-foreground-subtle">
              One report is created per partner found in the Excel Partner /
              Merchant / Vendor column (or Service–Partner maps for Iraq/Sudan).
            </p>
          ) : null}

          {periodStatusError ? (
            <p className={`mt-4 ${ui.alertError}`}>{periodStatusError}</p>
          ) : null}

          {periodStatusLoading ? (
            <p className="mt-4 text-sm text-foreground-muted">
              Checking whether a monthly report already exists for this
              period…
            </p>
          ) : null}

          {periodSubmission ? (
            <div className={`mt-4 ${ui.alertWarning}`}>
              <p className="font-medium text-foreground">
                A monthly report already exists for{" "}
                {periodSubmission.periodLabel}.
              </p>
              <p className="mt-1 text-sm text-foreground-muted">
                {periodSubmission.filename
                  ? `Current file: ${periodSubmission.filename}. `
                  : null}
                Replace it only after Dizlee approves a reupload request — not
                via a new first-time upload.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {periodSubmission.canRequestReupload ? (
                  <IconButton
                    label="Request reupload"
                    onClick={() =>
                      setChangeRequestSubmission(periodSubmission)
                    }
                  >
                    <IconRefresh />
                  </IconButton>
                ) : null}
                {periodSubmission.hasPendingChangeRequest ? (
                  <span className="text-sm text-foreground-muted">
                    Request submitted — awaiting Dizlee approval.
                  </span>
                ) : null}
                {periodSubmission.canReupload ? (
                  <Button
                    type="button"
                    onClick={() => setReuploadSubmission(periodSubmission)}
                  >
                    <span className="inline-flex items-center gap-2">
                      <IconUpload className="h-4 w-4" />
                      Upload corrected file
                    </span>
                  </Button>
                ) : null}
                <Link href={historyHref} className={ui.btnSecondary}>
                  Open report history
                </Link>
              </div>
            </div>
          ) : null}
        </PageSection>

        <PageSection
          title="Excel file"
          description={
            periodSubmission && !periodSubmission.canReupload
              ? "File upload is disabled for this period until Dizlee approves a reupload request."
              : periodSubmission?.canReupload
                ? "Use Upload corrected file above to replace the monthly Excel after approval."
                : "Drop your monthly .xlsx workbook. You will preview the sheet before confirming."
          }
        >
          <input
            ref={fileInputRef}
            id="file"
            name="file"
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={handleFileChange}
            disabled={dropzoneDisabled}
            className="sr-only"
          />
          <div
            role="button"
            tabIndex={dropzoneDisabled ? -1 : 0}
            aria-disabled={dropzoneDisabled || undefined}
            onClick={handleChooseFile}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                handleChooseFile();
              }
            }}
            onDragEnter={(event) => {
              event.preventDefault();
              if (!dropzoneDisabled) setIsDragging(true);
            }}
            onDragOver={(event) => {
              event.preventDefault();
              if (!dropzoneDisabled) setIsDragging(true);
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
              dropzoneDisabled &&
                "pointer-events-none cursor-not-allowed opacity-60",
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
            ) : periodBlocked && periodSubmission ? (
              <>
                <p className="text-base font-medium text-foreground">
                  Upload locked for {periodSubmission.periodLabel}
                </p>
                <p className="mt-1.5 text-sm text-foreground-subtle">
                  {periodSubmission.canRequestReupload
                    ? "Request a reupload above, then wait for Dizlee approval."
                    : periodSubmission.hasPendingChangeRequest
                      ? "Your reupload request is awaiting Dizlee approval."
                      : "Use Upload corrected file above when your request is accepted."}
                </p>
              </>
            ) : periodSubmission?.canReupload ? (
              <>
                <p className="text-base font-medium text-foreground">
                  Corrected file ready to upload
                </p>
                <p className="mt-1.5 text-sm text-foreground-subtle">
                  Use Upload corrected file in the banner above (not this
                  dropzone).
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
                <Link href={historyHref} className={ui.btnSecondary}>
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
              {partnerFromServiceMap
                ? `Period: ${MONTHS[month - 1]} ${year}. Partners come from the file or Admin mappings.`
                : `Partner and period: ${selectedPartnerName} — ${MONTHS[month - 1]} ${year}.`}
            </li>
            <li>
              If this period already has a monthly file, request a reupload and
              wait for Dizlee approval before replacing it.
            </li>
          </ul>
          <p className="text-xs text-foreground-subtle">
            Need an older file?{" "}
            <Link
              href={historyHref}
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

      {changeRequestSubmission ? (
        <SubmissionRequestChangeDialog
          submission={changeRequestSubmission}
          onClose={() => setChangeRequestSubmission(null)}
          onSuccess={() => {
            toast.success("Reupload request submitted.");
            void loadPeriodStatus(year, month);
          }}
        />
      ) : null}

      {reuploadSubmission ? (
        <SubmissionReuploadDialog
          submission={reuploadSubmission}
          preferredSheetName={preferredSheetName}
          onClose={() => setReuploadSubmission(null)}
          onSuccess={() => {
            toast.success("Corrected monthly report uploaded.");
            setReuploadSubmission(null);
            void loadPeriodStatus(year, month);
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
        <LoadingOverlay
          active={isNotifyingAdmin}
          label="Notifying Admin…"
          className="min-h-[8rem]"
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
        </LoadingOverlay>
      </Modal>
    </>
  );
}

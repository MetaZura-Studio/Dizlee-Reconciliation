"use client";

import Link from "next/link";
import { useRef, useState } from "react";

import { ReportUploadReviewModal } from "@/components/shared/report-upload-review-modal";
import type { LinkedPartner } from "@/lib/opco/queries/partners";
import { getDefaultPeriod } from "@/lib/opco/period";
import type { ReportPreviewLineItem } from "@/lib/platform/report-preview";

type ReportUploadFormProps = {
  partners: LinkedPartner[];
};

type UploadSuccess = {
  reportId: string;
  lineItemCount: number;
};

type ReviewState = {
  filename: string;
  lineItems: ReportPreviewLineItem[];
};

export function ReportUploadForm({ partners }: ReportUploadFormProps) {
  const defaultPeriod = getDefaultPeriod();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [partnerId, setPartnerId] = useState(partners[0]?.id ?? "");
  const [year, setYear] = useState(defaultPeriod.year);
  const [month, setMonth] = useState(defaultPeriod.month);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<UploadSuccess | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [review, setReview] = useState<ReviewState | null>(null);

  const selectedPartnerName =
    partners.find((partner) => partner.id === partnerId)?.name ?? "Partner";

  async function parseSelectedFile(selectedFile: File) {
    setError(null);
    setSuccess(null);
    setReview(null);
    setFile(selectedFile);
    setIsParsing(true);

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const response = await fetch("/api/opco/reports/parse-preview", {
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
    if (!file || !review) {
      return;
    }

    setError(null);
    setIsConfirming(true);

    const formData = new FormData();
    formData.append("partnerId", partnerId);
    formData.append("year", String(year));
    formData.append("month", String(month));
    formData.append("file", file);

    try {
      const response = await fetch("/api/opco/reports/upload", {
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
        setReview(null);
        return;
      }

      setSuccess({
        reportId: payload.reportId ?? "",
        lineItemCount: payload.lineItemCount ?? review.lineItems.length,
      });
      setReview(null);
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch {
      setError("Failed to upload report");
      setReview(null);
    } finally {
      setIsConfirming(false);
    }
  }

  if (partners.length === 0) {
    return (
      <div className="rounded-lg border border-warning-border bg-warning-muted p-4 text-sm text-warning">
        No partners are linked to your OpCo yet. Ask an admin to configure
        OpCo–Partner links before uploading reports.
      </div>
    );
  }

  return (
    <>
      <div className="max-w-2xl space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="partnerId" className="text-sm font-medium text-foreground-muted">
              Partner
            </label>
            <select
              id="partnerId"
              name="partnerId"
              value={partnerId}
              onChange={(event) => setPartnerId(event.target.value)}
              className="mt-1 block w-full rounded border border-border-strong px-3 py-2 text-sm"
              required
            >
              {partners.map((partner) => (
                <option key={partner.id} value={partner.id}>
                  {partner.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="year" className="text-sm font-medium text-foreground-muted">
              Year
            </label>
            <input
              id="year"
              name="year"
              type="number"
              min={2000}
              max={2100}
              value={year}
              onChange={(event) => setYear(Number(event.target.value))}
              className="mt-1 block w-full rounded border border-border-strong px-3 py-2 text-sm"
              required
            />
          </div>

          <div>
            <label htmlFor="month" className="text-sm font-medium text-foreground-muted">
              Month
            </label>
            <input
              id="month"
              name="month"
              type="number"
              min={1}
              max={12}
              value={month}
              onChange={(event) => setMonth(Number(event.target.value))}
              className="mt-1 block w-full rounded border border-border-strong px-3 py-2 text-sm"
              required
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="file" className="text-sm font-medium text-foreground-muted">
              Excel report (.xlsx)
            </label>
            <input
              ref={fileInputRef}
              id="file"
              name="file"
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={handleFileChange}
              disabled={isParsing || isConfirming}
              className="mt-1 block w-full text-sm text-foreground-muted disabled:opacity-60"
            />
            <p className="mt-2 text-xs text-foreground-subtle">
              Selecting a file opens a preview automatically. Confirm to upload, or
              reupload to choose a different file.
            </p>
            {isParsing ? (
              <p className="mt-2 text-sm text-foreground-muted">Parsing report…</p>
            ) : null}
          </div>
        </div>

        {error ? (
          <p className="rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </p>
        ) : null}

        {success ? (
          <div className="rounded border border-success-border bg-success-muted px-3 py-2 text-sm text-success">
            <p>
              Report uploaded successfully with {success.lineItemCount} line items.
            </p>
            <p className="mt-1">
              <Link href="/opco/reports" className="underline">
                View reports history
              </Link>
            </p>
          </div>
        ) : null}
      </div>

      {review ? (
        <ReportUploadReviewModal
          filename={review.filename}
          subtitle={`${selectedPartnerName} — ${month}/${year}`}
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

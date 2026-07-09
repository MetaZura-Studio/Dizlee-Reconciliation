"use client";

import { useState } from "react";

import { formatPeriodLabel } from "@/lib/opco/period";
import type { OpcoReportListItem } from "@/lib/opco/queries/reports";

type ReportReuploadDialogProps = {
  report: OpcoReportListItem;
  onClose: () => void;
  onSuccess: () => void;
};

export function ReportReuploadDialog({
  report,
  onClose,
  onSuccess,
}: ReportReuploadDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!file) {
      setError("Excel file is required");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/opco/reports/${report.id}/reupload`, {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(payload.error ?? "Failed to upload corrected report");
        return;
      }

      onSuccess();
      onClose();
    } catch {
      setError("Failed to upload corrected report");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
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
          {report.partnerName} — {formatPeriodLabel(report.year, report.month)}
        </p>
        <p className="mt-2 text-sm text-foreground-subtle">
          Dizlee approved your reupload request. Upload a corrected `.xlsx` file to
          replace the existing report.
        </p>

        <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="reupload-file" className="block text-sm font-medium text-foreground-muted">
              Corrected Excel file
            </label>
            <input
              id="reupload-file"
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              className="mt-1 block w-full text-sm"
              required
            />
          </div>

          {error ? (
            <p className="rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
              {error}
            </p>
          ) : null}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded border border-border-strong px-4 py-2 text-sm font-medium text-foreground-muted hover:bg-surface-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-60"
            >
              {isSubmitting ? "Uploading..." : "Upload corrected file"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

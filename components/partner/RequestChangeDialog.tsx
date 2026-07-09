"use client";

import { useState } from "react";

import { formatPeriodLabel } from "@/lib/partner/period";
import type { PartnerReportListItem } from "@/lib/partner/queries/reports";

type RequestChangeDialogProps = {
  report: PartnerReportListItem;
  onClose: () => void;
  onSuccess: () => void;
};

export function RequestChangeDialog({
  report,
  onClose,
  onSuccess,
}: RequestChangeDialogProps) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/partner/reports/change-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId: report.id, reason }),
      });

      const payload = (await response.json()) as { error?: string; message?: string };

      if (!response.ok) {
        setError(payload.error ?? "Failed to submit reupload request");
        return;
      }

      onSuccess();
      onClose();
    } catch {
      setError("Failed to submit reupload request");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        className="w-full max-w-lg rounded-lg border border-border bg-surface p-6 shadow-lg"
        role="dialog"
        aria-labelledby="request-change-title"
      >
        <h2 id="request-change-title" className="text-lg font-semibold text-foreground">
          Request reupload
        </h2>
        <p className="mt-1 text-sm text-foreground-muted">
          {report.opcoName} — {formatPeriodLabel(report.year, report.month)}
        </p>

        <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="change-reason" className="block text-sm font-medium text-foreground-muted">
              Reason
            </label>
            <textarea
              id="change-reason"
              rows={4}
              required
              minLength={10}
              maxLength={2000}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Explain what needs to be corrected in the report..."
              className="mt-1 w-full rounded border border-border-strong px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-foreground-subtle">
              Minimum 10 characters. Dizlee will review your request.
            </p>
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
              {isSubmitting ? "Submitting..." : "Submit request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

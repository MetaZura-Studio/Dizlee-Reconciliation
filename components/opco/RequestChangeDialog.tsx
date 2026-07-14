"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { FieldLabel } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { formatPeriodLabel } from "@/lib/opco/period";
import { ui } from "@/lib/ui/classes";
import type { OpcoReportListItem } from "@/lib/opco/queries/reports";

type RequestChangeDialogProps = {
  report: OpcoReportListItem;
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
      const response = await fetch("/api/opco/reports/change-request", {
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
    <Modal open title="Request reupload" onClose={onClose}>
      <p className="text-sm text-foreground-muted">
        {report.partnerName} — {formatPeriodLabel(report.year, report.month)}
      </p>

      <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
        <div>
          <FieldLabel htmlFor="change-reason">Reason</FieldLabel>
          <textarea
            id="change-reason"
            rows={4}
            required
            minLength={10}
            maxLength={2000}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Explain what needs to be corrected in the report..."
            className={`${ui.input} min-h-[120px] resize-y py-2`}
          />
          <p className={`mt-1 ${ui.hint}`}>
            Minimum 10 characters. Dizlee will review your request.
          </p>
        </div>

        {error ? <p className={ui.alertError}>{error}</p> : null}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Submitting..." : "Submit request"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

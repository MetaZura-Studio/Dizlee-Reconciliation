/**
 * OpCo dialog to request Dizlee approval for reuploading a monthly raw report file.
 */

"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { FieldLabel } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import type { OpcoSubmissionListItem } from "@/lib/opco/queries/submissions";
import { ui } from "@/lib/ui/classes";
import { formatAppError } from "@/lib/errors/format";

type SubmissionRequestChangeDialogProps = {
  submission: OpcoSubmissionListItem;
  onClose: () => void;
  onSuccess: () => void;
};

export function SubmissionRequestChangeDialog({
  submission,
  onClose,
  onSuccess,
}: SubmissionRequestChangeDialogProps) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/opco/submissions/change-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId: submission.id, reason }),
      });

      const payload = (await response.json()) as {
        error?: string;
        message?: string;
      };

      if (!response.ok) {
        setError(formatAppError(payload, "Failed to submit reupload request"));
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
        Monthly report — {submission.periodLabel}
        {submission.filename ? (
          <>
            {" "}
            · <span className="font-medium text-foreground">{submission.filename}</span>
          </>
        ) : null}
      </p>

      <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
        <div>
          <FieldLabel htmlFor="submission-change-reason" required>
            Reason
          </FieldLabel>
          <textarea
            id="submission-change-reason"
            rows={4}
            required
            minLength={10}
            maxLength={2000}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Explain what needs to be corrected in the monthly report..."
            className={`${ui.input} min-h-[120px] resize-y py-2`}
          />
          <p className={`mt-1 ${ui.hint}`}>
            Minimum 10 characters. Dizlee will review your request.
          </p>
        </div>

        {error ? <p className={ui.alertError}>{error}</p> : null}

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isSubmitting}
          >
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

"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { ModalCloseButton } from "@/components/ui/modal-close-button";
import { PortalOverlay } from "@/components/ui/portal-overlay";
import type { PartnerListItem } from "@/lib/admin/partners.shared";
import { ui } from "@/lib/ui/classes";

type PartnerDeleteModalProps = {
  open: boolean;
  partner: PartnerListItem | null;
  onClose: () => void;
  onDeleted: (message: string) => void;
};

export function PartnerDeleteModal({
  open,
  partner,
  onClose,
  onDeleted,
}: PartnerDeleteModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open || !partner) {
    return null;
  }

  const confirmDelete = async () => {
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/partners/${partner.id}`, {
        method: "DELETE",
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error ?? "Failed to delete Partner");
      }

      onDeleted("Partner deleted.");
      onClose();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Failed to delete Partner",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PortalOverlay onClose={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="partner-delete-title"
        className={ui.modal}
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id="partner-delete-title" className="text-lg font-semibold tracking-tight text-foreground">
            Delete Partner
          </h2>
          <ModalCloseButton onClick={onClose} disabled={submitting} />
        </div>
        <p className="mt-2 text-sm text-foreground-muted">
          This will soft-delete{" "}
          <span className="font-medium text-foreground">{partner.name}</span>.
          Linked users are not deleted; reassign or deactivate them separately.
        </p>

        {error ? <p className={`mt-3 ${ui.alertError}`}>{error}</p> : null}

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="danger" onClick={() => void confirmDelete()} disabled={submitting}>
            {submitting ? "Deleting…" : "Delete"}
          </Button>
        </div>
      </div>
    </PortalOverlay>
  );
}

"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { ModalCloseButton } from "@/components/ui/modal-close-button";
import { PortalOverlay } from "@/components/ui/portal-overlay";
import type { OpcoListItem } from "@/lib/admin/opcos.shared";
import { ui } from "@/lib/ui/classes";

type OpcoDeleteModalProps = {
  open: boolean;
  opco: OpcoListItem | null;
  onClose: () => void;
  onDeleted: (message: string) => void;
};

export function OpcoDeleteModal({
  open,
  opco,
  onClose,
  onDeleted,
}: OpcoDeleteModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open || !opco) {
    return null;
  }

  const confirmDelete = async () => {
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/opcos/${opco.id}`, {
        method: "DELETE",
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error ?? "Failed to delete OpCo");
      }

      onDeleted("OpCo deleted.");
      onClose();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Failed to delete OpCo",
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
        aria-labelledby="opco-delete-title"
        className={ui.modal}
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id="opco-delete-title" className="text-lg font-semibold tracking-tight text-foreground">
            Delete OpCo
          </h2>
          <ModalCloseButton onClick={onClose} disabled={submitting} />
        </div>
        <p className="mt-2 text-sm text-foreground-muted">
          This will soft-delete{" "}
          <span className="font-medium text-foreground">{opco.name}</span>.
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

"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { ModalCloseButton } from "@/components/ui/modal-close-button";
import { PortalOverlay } from "@/components/ui/portal-overlay";
import type { ServicePartnerMapListItem } from "@/lib/admin/service-partner-maps.shared";
import { formatAppError } from "@/lib/errors/format";
import { ui } from "@/lib/ui/classes";

type ServicePartnerMapDeleteModalProps = {
  open: boolean;
  map: ServicePartnerMapListItem | null;
  onClose: () => void;
  onDeleted: (message: string) => void;
};

export function ServicePartnerMapDeleteModal({
  open,
  map,
  onClose,
  onDeleted,
}: ServicePartnerMapDeleteModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open || !map) {
    return null;
  }

  const confirmDelete = async () => {
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/service-partner-maps/${map.id}`, {
        method: "DELETE",
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(formatAppError(body, "Failed to delete mapping"));
      }

      onDeleted("Mapping deleted.");
      onClose();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Failed to delete mapping",
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
        aria-labelledby="service-partner-map-delete-title"
        className={ui.modal}
      >
        <div className="flex items-start justify-between gap-4">
          <h2
            id="service-partner-map-delete-title"
            className="text-lg font-semibold tracking-tight text-foreground"
          >
            Delete mapping
          </h2>
          <ModalCloseButton onClick={onClose} disabled={submitting} />
        </div>
        <p className="mt-2 text-sm text-foreground-muted">
          Soft-delete mapping for{" "}
          <span className="font-medium text-foreground">{map.serviceName}</span>{" "}
          → {map.partnerName}.
        </p>

        {error ? <p className={`mt-3 ${ui.alertError}`}>{error}</p> : null}

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() => void confirmDelete()}
            disabled={submitting}
          >
            {submitting ? "Deleting…" : "Delete"}
          </Button>
        </div>
      </div>
    </PortalOverlay>
  );
}

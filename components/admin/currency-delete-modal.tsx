"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { ModalCloseButton } from "@/components/ui/modal-close-button";
import { PortalOverlay } from "@/components/ui/portal-overlay";
import type { CurrencyListItem } from "@/lib/admin/currencies.shared";
import { ui } from "@/lib/ui/classes";

type CurrencyDeleteModalProps = {
  open: boolean;
  currency: CurrencyListItem | null;
  onClose: () => void;
  onDeleted: (message: string) => void;
};

export function CurrencyDeleteModal({
  open,
  currency,
  onClose,
  onDeleted,
}: CurrencyDeleteModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open || !currency) {
    return null;
  }

  const confirmDelete = async () => {
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/currencies/${currency.id}`, {
        method: "DELETE",
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error ?? "Failed to delete currency");
      }

      onDeleted("Currency deleted.");
      onClose();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Failed to delete currency",
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
        aria-labelledby="currency-delete-title"
        className={ui.modal}
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id="currency-delete-title" className="text-lg font-semibold tracking-tight text-foreground">
            Delete currency
          </h2>
          <ModalCloseButton onClick={onClose} disabled={submitting} />
        </div>
        <p className="mt-2 text-sm text-foreground-muted">
          This will soft-delete{" "}
          <span className="font-medium text-foreground">{currency.isoCode}</span>.
          Currencies in use by OpCos, reports, or invoices cannot be deleted.
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

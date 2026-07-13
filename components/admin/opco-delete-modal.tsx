"use client";

import { useState } from "react";

import type { OpcoListItem } from "@/lib/admin/opcos.shared";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="opco-delete-title"
        className="w-full max-w-md rounded-lg bg-surface shadow-xl"
      >
        <div className="px-6 py-5">
          <h2
            id="opco-delete-title"
            className="text-lg font-semibold text-foreground"
          >
            Delete OpCo
          </h2>
          <p className="mt-2 text-sm text-foreground-muted">
            This will soft-delete{" "}
            <span className="font-medium text-foreground">{opco.name}</span>.
            Linked users are not deleted; reassign or deactivate them separately.
          </p>

          {error ? (
            <p className="mt-3 rounded-md border border-danger-border bg-danger-muted px-3 py-2 text-sm text-danger">
              {error}
            </p>
          ) : null}
        </div>

        <div className="flex justify-end gap-3 border-t border-border px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-md border border-border-strong px-4 py-2 text-sm font-medium text-foreground-muted hover:bg-surface-muted disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void confirmDelete()}
            disabled={submitting}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-red-700 disabled:opacity-60"
          >
            {submitting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

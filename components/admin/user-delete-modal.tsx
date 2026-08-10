"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { ModalCloseButton } from "@/components/ui/modal-close-button";
import { PortalOverlay } from "@/components/ui/portal-overlay";
import type { UserListItem } from "@/lib/admin/users.shared";
import { ui } from "@/lib/ui/classes";
import { formatAppError } from "@/lib/errors/format";

type UserDeleteModalProps = {
  open: boolean;
  user: UserListItem | null;
  onClose: () => void;
  onDeleted: (message: string) => void;
};

export function UserDeleteModal({
  open,
  user,
  onClose,
  onDeleted,
}: UserDeleteModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open || !user) {
    return null;
  }

  const confirmDelete = async () => {
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: "DELETE",
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(formatAppError(body, "Failed to delete user"));
      }

      onDeleted("User deleted.");
      onClose();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Failed to delete user",
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
        aria-labelledby="user-delete-title"
        className={ui.modal}
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id="user-delete-title" className="text-lg font-semibold tracking-tight text-foreground">
            Delete user
          </h2>
          <ModalCloseButton onClick={onClose} disabled={submitting} />
        </div>
        <p className="mt-2 text-sm text-foreground-muted">
          This will deactivate and soft-delete{" "}
          <span className="font-medium text-foreground">{user.email}</span>. The
          user will no longer be able to sign in.
        </p>

        {error ? <p className={`mt-3 ${ui.alertError}`}>{error}</p> : null}

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="danger" onClick={() => void confirmDelete()} disabled={submitting}>
            {submitting ? "Deleting…" : "Delete user"}
          </Button>
        </div>
      </div>
    </PortalOverlay>
  );
}

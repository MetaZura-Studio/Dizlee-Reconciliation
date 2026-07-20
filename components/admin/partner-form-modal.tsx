"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { FieldLegend } from "@/components/ui/field";
import { ModalCloseButton } from "@/components/ui/modal-close-button";
import { PortalOverlay } from "@/components/ui/portal-overlay";
import type {
  AdminEntityStatus,
  PartnerListItem,
} from "@/lib/admin/partners.shared";
import { ui } from "@/lib/ui/classes";

type PartnerFormValues = {
  name: string;
  status: AdminEntityStatus;
};

type PartnerFormModalProps = {
  open: boolean;
  mode: "create" | "edit";
  partner: PartnerListItem | null;
  onClose: () => void;
  onSaved: (partner: PartnerListItem, message: string) => void;
};

type PartnerFormModalContentProps = {
  mode: "create" | "edit";
  partner: PartnerListItem | null;
  onClose: () => void;
  onSaved: (partner: PartnerListItem, message: string) => void;
};

function getInitialValues(
  mode: "create" | "edit",
  partner: PartnerListItem | null,
): PartnerFormValues {
  if (mode === "edit" && partner) {
    return {
      name: partner.name,
      status: partner.status,
    };
  }

  return {
    name: "",
    status: "ACTIVE",
  };
}

function PartnerFormModalContent({
  mode,
  partner,
  onClose,
  onSaved,
}: PartnerFormModalContentProps) {
  const [values, setValues] = useState<PartnerFormValues>(() =>
    getInitialValues(mode, partner),
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        name: values.name,
        status: values.status,
      };

      const response = await fetch(
        mode === "create"
          ? "/api/admin/partners"
          : `/api/admin/partners/${partner?.id}`,
        {
          method: mode === "create" ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error ?? "Failed to save Partner");
      }

      onSaved(
        body.data as PartnerListItem,
        mode === "create" ? "Partner created." : "Partner updated.",
      );
      onClose();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to save Partner",
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
        aria-labelledby="partner-form-title"
        className={ui.modal}
      >
        <form onSubmit={(event) => void submit(event)}>
          <div className="flex items-start justify-between gap-4">
            <h2 id="partner-form-title" className="text-lg font-semibold tracking-tight text-foreground">
              {mode === "create" ? "Create Partner" : "Edit Partner"}
            </h2>
            <ModalCloseButton onClick={onClose} disabled={submitting} />
          </div>

          <div className="mt-4 space-y-4">
            {error ? <p className={ui.alertError}>{error}</p> : null}

            <label className="block text-sm">
              <FieldLegend required>Name</FieldLegend>
              <input
                value={values.name}
                onChange={(event) =>
                  setValues((current) => ({ ...current, name: event.target.value }))
                }
                required
                className={ui.input}
              />
            </label>

            <label className="block text-sm">
              <FieldLegend>Status</FieldLegend>
              <select
                value={values.status}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    status: event.target.value as AdminEntityStatus,
                  }))
                }
                className={ui.select}
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </label>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      </div>
    </PortalOverlay>
  );
}

export function PartnerFormModal({
  open,
  mode,
  partner,
  onClose,
  onSaved,
}: PartnerFormModalProps) {
  if (!open) {
    return null;
  }

  return (
    <PartnerFormModalContent
      key={`${mode}-${partner?.id ?? "new"}`}
      mode={mode}
      partner={partner}
      onClose={onClose}
      onSaved={onSaved}
    />
  );
}

"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { FieldLegend } from "@/components/ui/field";
import { ModalCloseButton } from "@/components/ui/modal-close-button";
import { PortalOverlay } from "@/components/ui/portal-overlay";
import type { CurrencyListItem } from "@/lib/admin/currencies.shared";
import type {
  AdminEntityStatus,
  OpcoListItem,
} from "@/lib/admin/opcos.shared";
import { ui } from "@/lib/ui/classes";
import { formatAppError } from "@/lib/errors/format";

type OpcoFormValues = {
  name: string;
  defaultCurrencyId: string;
  vatPercent: string;
  status: AdminEntityStatus;
};

type OpcoFormModalProps = {
  open: boolean;
  mode: "create" | "edit";
  opco: OpcoListItem | null;
  currencies: CurrencyListItem[];
  onClose: () => void;
  onSaved: (opco: OpcoListItem, message: string) => void;
};

type OpcoFormModalContentProps = {
  mode: "create" | "edit";
  opco: OpcoListItem | null;
  currencies: CurrencyListItem[];
  onClose: () => void;
  onSaved: (opco: OpcoListItem, message: string) => void;
};

function getInitialValues(
  mode: "create" | "edit",
  opco: OpcoListItem | null,
  currencies: CurrencyListItem[],
): OpcoFormValues {
  if (mode === "edit" && opco) {
    const vat = Number.isFinite(opco.vatPercent) ? opco.vatPercent : 0;
    return {
      name: opco.name,
      defaultCurrencyId: opco.defaultCurrencyId,
      vatPercent: String(vat),
      status: opco.status,
    };
  }

  const kwd = currencies.find((currency) => currency.isoCode === "KWD");
  return {
    name: "",
    defaultCurrencyId: kwd?.id ?? currencies[0]?.id ?? "",
    vatPercent: "0",
    status: "ACTIVE",
  };
}

function OpcoFormModalContent({
  mode,
  opco,
  currencies,
  onClose,
  onSaved,
}: OpcoFormModalContentProps) {
  const [values, setValues] = useState<OpcoFormValues>(() =>
    getInitialValues(mode, opco, currencies),
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const parsedVat = Number.parseFloat(values.vatPercent.trim());
      const payload = {
        name: values.name,
        defaultCurrencyId: values.defaultCurrencyId,
        vatPercent: Number.isFinite(parsedVat) ? parsedVat : 0,
        status: values.status,
      };

      const response = await fetch(
        mode === "create" ? "/api/admin/opcos" : `/api/admin/opcos/${opco?.id}`,
        {
          method: mode === "create" ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const body = await response.json();
      if (!response.ok) {
        throw new Error(formatAppError(body, "Failed to save OpCo"));
      }

      onSaved(
        body.data as OpcoListItem,
        mode === "create" ? "OpCo created." : "OpCo updated.",
      );
      onClose();
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Failed to save OpCo",
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
        aria-labelledby="opco-form-title"
        className={ui.modal}
      >
        <form onSubmit={(event) => void submit(event)}>
          <div className="flex items-start justify-between gap-4">
            <h2 id="opco-form-title" className="text-lg font-semibold tracking-tight text-foreground">
              {mode === "create" ? "Create OpCo" : "Edit OpCo"}
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
              <FieldLegend required>Default currency</FieldLegend>
              <select
                value={values.defaultCurrencyId}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    defaultCurrencyId: event.target.value,
                  }))
                }
                required
                className={ui.select}
              >
                {currencies.length === 0 ? (
                  <option value="">No currencies available</option>
                ) : (
                  currencies.map((currency) => (
                    <option key={currency.id} value={currency.id}>
                      {currency.isoCode}
                      {currency.symbol ? ` (${currency.symbol})` : ""}
                    </option>
                  ))
                )}
              </select>
            </label>

            <label className="block text-sm">
              <FieldLegend required>VAT %</FieldLegend>
              <input
                type="text"
                inputMode="decimal"
                value={values.vatPercent}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    vatPercent: event.target.value,
                  }))
                }
                placeholder="e.g. 5 or 15.5"
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
            <Button type="submit" disabled={submitting || currencies.length === 0}>
              {submitting ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      </div>
    </PortalOverlay>
  );
}

export function OpcoFormModal({
  open,
  mode,
  opco,
  currencies,
  onClose,
  onSaved,
}: OpcoFormModalProps) {
  if (!open) {
    return null;
  }

  return (
    <OpcoFormModalContent
      key={`${mode}-${opco?.id ?? "new"}`}
      mode={mode}
      opco={opco}
      currencies={currencies}
      onClose={onClose}
      onSaved={onSaved}
    />
  );
}

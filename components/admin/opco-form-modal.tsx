"use client";

import { useState } from "react";

import type { CurrencyListItem } from "@/lib/admin/currencies.shared";
import type {
  AdminEntityStatus,
  OpcoListItem,
} from "@/lib/admin/opcos.shared";

type OpcoFormValues = {
  name: string;
  defaultCurrencyId: string;
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
    return {
      name: opco.name,
      defaultCurrencyId: opco.defaultCurrencyId,
      status: opco.status,
    };
  }

  const usd = currencies.find((currency) => currency.isoCode === "USD");
  return {
    name: "",
    defaultCurrencyId: usd?.id ?? currencies[0]?.id ?? "",
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
      const payload = {
        name: values.name,
        defaultCurrencyId: values.defaultCurrencyId,
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
        throw new Error(body.error ?? "Failed to save OpCo");
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="opco-form-title"
        className="w-full max-w-md rounded-lg bg-surface shadow-xl"
      >
        <form onSubmit={(event) => void submit(event)}>
          <div className="space-y-4 px-6 py-5">
            <h2 id="opco-form-title" className="text-lg font-semibold text-foreground">
              {mode === "create" ? "Create OpCo" : "Edit OpCo"}
            </h2>

            {error ? (
              <p className="rounded-md border border-danger-border bg-danger-muted px-3 py-2 text-sm text-danger">
                {error}
              </p>
            ) : null}

            <label className="block space-y-1 text-sm">
              <span className="font-medium text-foreground-muted">Name</span>
              <input
                value={values.name}
                onChange={(event) =>
                  setValues((current) => ({ ...current, name: event.target.value }))
                }
                required
                className="w-full rounded-md border border-border-strong px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </label>

            <label className="block space-y-1 text-sm">
              <span className="font-medium text-foreground-muted">
                Default currency
              </span>
              <select
                value={values.defaultCurrencyId}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    defaultCurrencyId: event.target.value,
                  }))
                }
                required
                className="w-full rounded-md border border-border-strong px-3 py-2 text-sm outline-none focus:border-primary"
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

            <label className="block space-y-1 text-sm">
              <span className="font-medium text-foreground-muted">Status</span>
              <select
                value={values.status}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    status: event.target.value as AdminEntityStatus,
                  }))
                }
                className="w-full rounded-md border border-border-strong px-3 py-2 text-sm outline-none focus:border-primary"
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </label>
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
              type="submit"
              disabled={submitting || currencies.length === 0}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-60"
            >
              {submitting ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
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

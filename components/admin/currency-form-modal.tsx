"use client";

import { useState } from "react";

import type { CurrencyListItem } from "@/lib/admin/currencies.shared";

type CurrencyFormValues = {
  isoCode: string;
  symbol: string;
  decimalPrecision: string;
};

type CurrencyFormModalProps = {
  open: boolean;
  mode: "create" | "edit";
  currency: CurrencyListItem | null;
  onClose: () => void;
  onSaved: (currency: CurrencyListItem, message: string) => void;
};

type CurrencyFormModalContentProps = {
  mode: "create" | "edit";
  currency: CurrencyListItem | null;
  onClose: () => void;
  onSaved: (currency: CurrencyListItem, message: string) => void;
};

const EMPTY_FORM: CurrencyFormValues = {
  isoCode: "",
  symbol: "",
  decimalPrecision: "2",
};

function getInitialValues(
  mode: "create" | "edit",
  currency: CurrencyListItem | null,
): CurrencyFormValues {
  if (mode === "edit" && currency) {
    return {
      isoCode: currency.isoCode,
      symbol: currency.symbol ?? "",
      decimalPrecision: String(currency.decimalPrecision),
    };
  }

  return EMPTY_FORM;
}

function CurrencyFormModalContent({
  mode,
  currency,
  onClose,
  onSaved,
}: CurrencyFormModalContentProps) {
  const [values, setValues] = useState<CurrencyFormValues>(() =>
    getInitialValues(mode, currency),
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const decimalPrecision = Number.parseInt(values.decimalPrecision, 10);
      if (Number.isNaN(decimalPrecision)) {
        throw new Error("Decimal precision must be a number");
      }

      const payload =
        mode === "create"
          ? {
              isoCode: values.isoCode,
              symbol: values.symbol,
              decimalPrecision,
            }
          : {
              symbol: values.symbol,
              decimalPrecision,
            };

      const response = await fetch(
        mode === "create"
          ? "/api/admin/currencies"
          : `/api/admin/currencies/${currency?.id}`,
        {
          method: mode === "create" ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error ?? "Failed to save currency");
      }

      onSaved(
        body.data as CurrencyListItem,
        mode === "create" ? "Currency created." : "Currency updated.",
      );
      onClose();
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Failed to save currency",
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
        aria-labelledby="currency-form-title"
        className="w-full max-w-md rounded-lg bg-surface shadow-xl"
      >
        <form onSubmit={(event) => void submit(event)}>
          <div className="space-y-4 px-6 py-5">
            <h2 id="currency-form-title" className="text-lg font-semibold text-foreground">
              {mode === "create" ? "Add currency" : "Edit currency"}
            </h2>

            {error ? (
              <p className="rounded-md border border-danger-border bg-danger-muted px-3 py-2 text-sm text-danger">
                {error}
              </p>
            ) : null}

            <div className="space-y-1">
              <label htmlFor="isoCode" className="text-sm font-medium text-foreground-muted">
                ISO code
              </label>
              <input
                id="isoCode"
                value={values.isoCode}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    isoCode: event.target.value.toUpperCase(),
                  }))
                }
                disabled={mode === "edit"}
                required
                className="w-full rounded-md border border-border-strong px-3 py-2 text-sm uppercase outline-none focus:border-primary disabled:bg-surface-muted"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="symbol" className="text-sm font-medium text-foreground-muted">
                Symbol
              </label>
              <input
                id="symbol"
                value={values.symbol}
                onChange={(event) =>
                  setValues((current) => ({ ...current, symbol: event.target.value }))
                }
                className="w-full rounded-md border border-border-strong px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor="decimalPrecision"
                className="text-sm font-medium text-foreground-muted"
              >
                Decimal precision
              </label>
              <input
                id="decimalPrecision"
                type="number"
                min={0}
                max={8}
                value={values.decimalPrecision}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    decimalPrecision: event.target.value,
                  }))
                }
                required
                className="w-full rounded-md border border-border-strong px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </div>
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
              disabled={submitting}
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

export function CurrencyFormModal({
  open,
  mode,
  currency,
  onClose,
  onSaved,
}: CurrencyFormModalProps) {
  if (!open) {
    return null;
  }

  return (
    <CurrencyFormModalContent
      key={`${mode}-${currency?.id ?? "new"}`}
      mode={mode}
      currency={currency}
      onClose={onClose}
      onSaved={onSaved}
    />
  );
}

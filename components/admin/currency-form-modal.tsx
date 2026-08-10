"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { FieldLabel } from "@/components/ui/field";
import { ModalCloseButton } from "@/components/ui/modal-close-button";
import { PortalOverlay } from "@/components/ui/portal-overlay";
import type { CurrencyListItem } from "@/lib/admin/currencies.shared";
import { ui } from "@/lib/ui/classes";
import { formatAppError } from "@/lib/errors/format";

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
        throw new Error(formatAppError(body, "Failed to save currency"));
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
    <PortalOverlay onClose={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="currency-form-title"
        className={ui.modal}
      >
        <form onSubmit={(event) => void submit(event)}>
          <div className="flex items-start justify-between gap-4">
            <h2 id="currency-form-title" className="text-lg font-semibold tracking-tight text-foreground">
              {mode === "create" ? "Add currency" : "Edit currency"}
            </h2>
            <ModalCloseButton onClick={onClose} disabled={submitting} />
          </div>

          <div className="mt-4 space-y-4">
            {error ? <p className={ui.alertError}>{error}</p> : null}

            <div className="space-y-1">
              <FieldLabel htmlFor="isoCode" required>
                ISO code
              </FieldLabel>
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
                className={`${ui.input} uppercase disabled:bg-surface-muted`}
              />
            </div>

            <div className="space-y-1">
              <FieldLabel htmlFor="symbol">Symbol</FieldLabel>
              <input
                id="symbol"
                value={values.symbol}
                onChange={(event) =>
                  setValues((current) => ({ ...current, symbol: event.target.value }))
                }
                className={ui.input}
              />
            </div>

            <div className="space-y-1">
              <FieldLabel htmlFor="decimalPrecision" required>
                Decimal precision
              </FieldLabel>
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
                className={ui.input}
              />
            </div>
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

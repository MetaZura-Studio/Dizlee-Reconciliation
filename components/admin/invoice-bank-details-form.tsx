"use client";

import { useCallback, useState } from "react";

import {
  EMPTY_INVOICE_BANK_DETAILS,
  type InvoiceBankDetailsView,
} from "@/lib/admin/invoice-bank-details.shared";

type InvoiceBankDetailsFormProps = {
  initialSettings: InvoiceBankDetailsView;
};

type FormState = {
  bankName: string;
  accountName: string;
  accountNumber: string;
  iban: string;
  swift: string;
  reference: string;
};

function toFormState(settings: InvoiceBankDetailsView): FormState {
  return {
    bankName: settings.bankName ?? "",
    accountName: settings.accountName ?? "",
    accountNumber: settings.accountNumber ?? "",
    iban: settings.iban ?? "",
    swift: settings.swift ?? "",
    reference: settings.reference ?? "",
  };
}

const FIELDS: Array<{ key: keyof FormState; label: string }> = [
  { key: "bankName", label: "Bank name" },
  { key: "accountName", label: "Account name" },
  { key: "accountNumber", label: "Account number" },
  { key: "iban", label: "IBAN" },
  { key: "swift", label: "SWIFT / BIC" },
  { key: "reference", label: "Payment reference" },
];

export function InvoiceBankDetailsForm({
  initialSettings,
}: InvoiceBankDetailsFormProps) {
  const [form, setForm] = useState(() => toFormState(initialSettings));
  const [savedSettings, setSavedSettings] = useState(initialSettings);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [reloading, setReloading] = useState(false);

  const applySettings = useCallback((settings: InvoiceBankDetailsView) => {
    setSavedSettings(settings);
    setForm(toFormState(settings));
  }, []);

  const reloadSettings = async () => {
    setError(null);
    setSuccess(null);
    setReloading(true);

    try {
      const response = await fetch("/api/admin/invoice-bank-details");
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error ?? "Failed to reload invoice bank details");
      }
      applySettings(body.data as InvoiceBankDetailsView);
    } catch (reloadError) {
      setError(
        reloadError instanceof Error
          ? reloadError.message
          : "Failed to reload invoice bank details",
      );
    } finally {
      setReloading(false);
    }
  };

  const saveSettings = async (payload: FormState) => {
    setError(null);
    setSuccess(null);
    setSaving(true);

    try {
      const response = await fetch("/api/admin/invoice-bank-details", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error ?? "Failed to save invoice bank details");
      }

      applySettings(body.data as InvoiceBankDetailsView);
      setSuccess("Invoice bank details saved.");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to save invoice bank details",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    void saveSettings(form);
  };

  const handleClearAll = () => {
    const cleared = toFormState(EMPTY_INVOICE_BANK_DETAILS);
    setForm(cleared);
    void saveSettings(cleared);
  };

  return (
    <div className="space-y-6">
      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {success}
        </p>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          {FIELDS.map((field) => (
            <div key={field.key} className="space-y-1">
              <label
                htmlFor={field.key}
                className="text-sm font-medium text-zinc-700"
              >
                {field.label}
              </label>
              <input
                id={field.key}
                type="text"
                value={form[field.key]}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    [field.key]: event.target.value,
                  }))
                }
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
              />
            </div>
          ))}
        </div>

        <p className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-600">
          These details appear on new Dizlee → OpCo digital invoices. Existing
          invoices are not changed when you update this form.
        </p>

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={saving || reloading}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={() => void reloadSettings()}
            disabled={saving || reloading}
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
          >
            {reloading ? "Reloading…" : "Reload"}
          </button>
          <button
            type="button"
            onClick={handleClearAll}
            disabled={saving || reloading}
            className="rounded-md border border-red-200 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
          >
            Clear all
          </button>
        </div>
      </form>

      <p className="text-xs text-zinc-500">
        Last saved bank name: {savedSettings.bankName ?? "Not set"}
      </p>
    </div>
  );
}

"use client";

import { useCallback, useState } from "react";

import type { InvoiceBankDetailsListView } from "@/lib/admin/invoice-bank-details.shared";

type InvoiceBankDetailsFormProps = {
  initialSettings: InvoiceBankDetailsListView;
};

type AccountForm = {
  id: string;
  label: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  iban: string;
  swift: string;
  reference: string;
};

const FIELDS: Array<{
  key: Exclude<keyof AccountForm, "id" | "label">;
  label: string;
}> = [
  { key: "bankName", label: "Bank name" },
  { key: "accountName", label: "Account name" },
  { key: "accountNumber", label: "Account number" },
  { key: "iban", label: "IBAN" },
  { key: "swift", label: "SWIFT / BIC" },
  { key: "reference", label: "Payment reference" },
];

function toFormAccounts(settings: InvoiceBankDetailsListView): AccountForm[] {
  return settings.accounts.map((account) => ({
    id: account.id,
    label: account.label,
    bankName: account.bankName ?? "",
    accountName: account.accountName ?? "",
    accountNumber: account.accountNumber ?? "",
    iban: account.iban ?? "",
    swift: account.swift ?? "",
    reference: account.reference ?? "",
  }));
}

function emptyAccount(): AccountForm {
  return {
    id: `new_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    label: "",
    bankName: "",
    accountName: "",
    accountNumber: "",
    iban: "",
    swift: "",
    reference: "",
  };
}

export function InvoiceBankDetailsForm({
  initialSettings,
}: InvoiceBankDetailsFormProps) {
  const [accounts, setAccounts] = useState(() => toFormAccounts(initialSettings));
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [reloading, setReloading] = useState(false);

  const applySettings = useCallback((settings: InvoiceBankDetailsListView) => {
    setAccounts(toFormAccounts(settings));
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
      applySettings(body.data as InvoiceBankDetailsListView);
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

  const saveSettings = async (nextAccounts: AccountForm[]) => {
    setError(null);
    setSuccess(null);
    setSaving(true);

    try {
      const response = await fetch("/api/admin/invoice-bank-details", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accounts: nextAccounts.map((account) => ({
            id: account.id.startsWith("new_") ? undefined : account.id,
            label: account.label,
            bankName: account.bankName,
            accountName: account.accountName,
            accountNumber: account.accountNumber,
            iban: account.iban,
            swift: account.swift,
            reference: account.reference,
          })),
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error ?? "Failed to save invoice bank details");
      }

      applySettings(body.data as InvoiceBankDetailsListView);
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
    void saveSettings(accounts);
  };

  const updateAccount = <K extends keyof AccountForm>(
    id: string,
    key: K,
    value: AccountForm[K],
  ) => {
    setAccounts((current) =>
      current.map((account) =>
        account.id === id ? { ...account, [key]: value } : account,
      ),
    );
  };

  return (
    <div className="space-y-6">
      {error ? (
        <p className="rounded-md border border-danger-border bg-danger-muted px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="rounded-md border border-success-border bg-success-muted px-3 py-2 text-sm text-success">
          {success}
        </p>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-foreground-muted">
            {accounts.length === 0
              ? "No bank accounts yet."
              : accounts.length === 1
                ? "1 account — used automatically on invoices."
                : `${accounts.length} accounts — invoice create will ask which to use.`}
          </p>
          <button
            type="button"
            onClick={() => setAccounts((current) => [...current, emptyAccount()])}
            disabled={saving || reloading}
            className="rounded-md border border-border-strong px-3 py-1.5 text-sm text-foreground-muted hover:bg-surface-muted disabled:opacity-60"
          >
            Add bank account
          </button>
        </div>

        {accounts.length === 0 ? (
          <p className="rounded-md border border-border bg-surface-muted px-3 py-4 text-sm text-foreground-subtle">
            Add at least one bank account for Dizlee → OpCo digital invoices.
          </p>
        ) : (
          <div className="space-y-4">
            {accounts.map((account, index) => (
              <section
                key={account.id}
                className="space-y-4 rounded-lg border border-border p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-sm font-semibold text-foreground">
                    Account {index + 1}
                  </h2>
                  <button
                    type="button"
                    onClick={() =>
                      setAccounts((current) =>
                        current.filter((item) => item.id !== account.id),
                      )
                    }
                    disabled={saving || reloading}
                    className="text-xs text-danger hover:underline disabled:opacity-60"
                  >
                    Remove
                  </button>
                </div>

                <label className="block space-y-1 text-sm sm:max-w-md">
                  <span className="font-medium text-foreground-muted">Label</span>
                  <input
                    type="text"
                    value={account.label}
                    onChange={(event) =>
                      updateAccount(account.id, "label", event.target.value)
                    }
                    placeholder="e.g. Primary USD"
                    required
                    className="w-full rounded-md border border-border-strong px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  {FIELDS.map((field) => (
                    <label key={field.key} className="block space-y-1 text-sm">
                      <span className="font-medium text-foreground-muted">
                        {field.label}
                      </span>
                      <input
                        type="text"
                        value={account[field.key]}
                        onChange={(event) =>
                          updateAccount(account.id, field.key, event.target.value)
                        }
                        className="w-full rounded-md border border-border-strong px-3 py-2 text-sm outline-none focus:border-primary"
                      />
                    </label>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        <p className="rounded-md border border-border bg-surface-muted px-3 py-2 text-sm text-foreground-muted">
          Selected bank details are saved onto each new Dizlee → OpCo invoice when
          it is created.
        </p>

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={saving || reloading}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={() => void reloadSettings()}
            disabled={saving || reloading}
            className="rounded-md border border-border-strong px-4 py-2 text-sm font-medium text-foreground-muted hover:bg-surface-muted disabled:opacity-60"
          >
            {reloading ? "Reloading…" : "Reload"}
          </button>
          <button
            type="button"
            onClick={() => {
              setAccounts([]);
              void saveSettings([]);
            }}
            disabled={saving || reloading}
            className="rounded-md border border-danger-border px-4 py-2 text-sm font-medium text-danger hover:bg-danger-muted disabled:opacity-60"
          >
            Clear all
          </button>
        </div>
      </form>
    </div>
  );
}

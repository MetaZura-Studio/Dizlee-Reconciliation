"use client";

import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import { FieldLegend } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import type { InvoiceBankDetailsListView } from "@/lib/admin/invoice-bank-details.shared";
import { ui } from "@/lib/ui/classes";

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
  const toast = useToast();
  const [accounts, setAccounts] = useState(() => toFormAccounts(initialSettings));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [reloading, setReloading] = useState(false);

  const applySettings = useCallback((settings: InvoiceBankDetailsListView) => {
    setAccounts(toFormAccounts(settings));
  }, []);

  const reloadSettings = async () => {
    setError(null);
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
      toast.success("Invoice bank details saved.");
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
      {error ? <p className={ui.alertError}>{error}</p> : null}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex flex-wrap items-center justify-end gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setAccounts((current) => [...current, emptyAccount()])}
            disabled={saving || reloading}
          >
            Add bank account
          </Button>
        </div>

        {accounts.length === 0 ? (
          <p className={`${ui.emptyState} text-sm text-foreground-subtle`}>
            Add at least one bank account for Dizlee → OpCo digital invoices.
          </p>
        ) : (
          <div className="space-y-4">
            {accounts.map((account, index) => (
              <section key={account.id} className={`space-y-4 ${ui.cardPaddingLg}`}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-sm font-semibold text-foreground">
                    Account {index + 1}
                  </h2>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() =>
                      setAccounts((current) =>
                        current.filter((item) => item.id !== account.id),
                      )
                    }
                    disabled={saving || reloading}
                    className="text-danger hover:text-danger"
                  >
                    Remove
                  </Button>
                </div>

                <label className="block text-sm sm:max-w-md">
                  <FieldLegend required>Label</FieldLegend>
                  <input
                    type="text"
                    value={account.label}
                    onChange={(event) =>
                      updateAccount(account.id, "label", event.target.value)
                    }
                    placeholder="e.g. Primary USD"
                    required
                    className={ui.input}
                  />
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  {FIELDS.map((field) => (
                    <label key={field.key} className="block text-sm">
                      <span className={ui.label}>{field.label}</span>
                      <input
                        type="text"
                        value={account[field.key]}
                        onChange={(event) =>
                          updateAccount(account.id, field.key, event.target.value)
                        }
                        className={ui.input}
                      />
                    </label>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={saving || reloading}>
            {saving ? "Saving…" : "Save"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => void reloadSettings()}
            disabled={saving || reloading}
          >
            {reloading ? "Reloading…" : "Reload"}
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={() => {
              setAccounts([]);
              void saveSettings([]);
            }}
            disabled={saving || reloading}
          >
            Clear all
          </Button>
        </div>
      </form>
    </div>
  );
}

"use client";

import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import { FieldLegend } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import type { InvoiceBankDetailsListView } from "@/lib/admin/invoice-bank-details.shared";
import { ui } from "@/lib/ui/classes";
import { formatAppError } from "@/lib/errors/format";

type InvoiceBankDetailsFormProps = {
  initialSettings: InvoiceBankDetailsListView;
};

type AccountForm = {
  id: string;
  label: string;
  isDefault: boolean;
  bankName: string;
  accountName: string;
  accountNumber: string;
  iban: string;
  swift: string;
  reference: string;
};

const FIELDS: Array<{
  key: Exclude<keyof AccountForm, "id" | "label" | "isDefault">;
  label: string;
}> = [
  { key: "bankName", label: "Bank name" },
  { key: "accountName", label: "Account name" },
  { key: "accountNumber", label: "Account number" },
  { key: "iban", label: "IBAN" },
  { key: "swift", label: "SWIFT / BIC" },
  { key: "reference", label: "Payment reference" },
];

function withSingleDefault(accounts: AccountForm[]): AccountForm[] {
  if (accounts.length === 0) {
    return [];
  }
  if (accounts.length === 1) {
    return [{ ...accounts[0], isDefault: true }];
  }
  const preferred = accounts.findIndex((account) => account.isDefault);
  const defaultIndex = preferred >= 0 ? preferred : 0;
  return accounts.map((account, index) => ({
    ...account,
    isDefault: index === defaultIndex,
  }));
}

function toFormAccounts(settings: InvoiceBankDetailsListView): AccountForm[] {
  return withSingleDefault(
    settings.accounts.map((account) => ({
      id: account.id,
      label: account.label,
      isDefault: account.isDefault ?? false,
      bankName: account.bankName ?? "",
      accountName: account.accountName ?? "",
      accountNumber: account.accountNumber ?? "",
      iban: account.iban ?? "",
      swift: account.swift ?? "",
      reference: account.reference ?? "",
    })),
  );
}

function emptyAccount(makeDefault: boolean): AccountForm {
  return {
    id: `new_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    label: "",
    isDefault: makeDefault,
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
        throw new Error(formatAppError(body, "Failed to reload invoice bank details"));
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
    const normalized = withSingleDefault(nextAccounts);

    try {
      const response = await fetch("/api/admin/invoice-bank-details", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accounts: normalized.map((account) => ({
            id: account.id.startsWith("new_") ? undefined : account.id,
            label: account.label,
            isDefault: account.isDefault,
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
        throw new Error(formatAppError(body, "Failed to save invoice bank details"));
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
      withSingleDefault(
        current.map((account) =>
          account.id === id ? { ...account, [key]: value } : account,
        ),
      ),
    );
  };

  const setDefaultAccount = (id: string) => {
    setAccounts((current) =>
      current.map((account) => ({
        ...account,
        isDefault: account.id === id,
      })),
    );
  };

  return (
    <div className="space-y-6">
      {error ? <p className={ui.alertError}>{error}</p> : null}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-foreground-muted">
            With one account it is always the default. With several, pick which
            bank is selected by default on Dizlee → OpCo invoices (others remain
            choosable).
          </p>
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              setAccounts((current) =>
                withSingleDefault([
                  ...current.map((account) => ({ ...account, isDefault: false })),
                  emptyAccount(current.length === 0),
                ]),
              )
            }
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
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-sm font-semibold text-foreground">
                      Account {index + 1}
                    </h2>
                    {account.isDefault ? (
                      <span className="rounded-full bg-primary-muted px-2.5 py-0.5 text-xs font-medium text-primary">
                        Default
                      </span>
                    ) : null}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() =>
                      setAccounts((current) =>
                        withSingleDefault(
                          current.filter((item) => item.id !== account.id),
                        ),
                      )
                    }
                    disabled={saving || reloading}
                    className="text-danger hover:text-danger"
                  >
                    Remove
                  </Button>
                </div>

                {accounts.length > 1 ? (
                  <label className="flex items-center gap-2 text-sm text-foreground">
                    <input
                      type="radio"
                      name="default-bank-account"
                      checked={account.isDefault}
                      onChange={() => setDefaultAccount(account.id)}
                      disabled={saving || reloading}
                      className="h-4 w-4 accent-primary"
                    />
                    Use as default on invoices
                  </label>
                ) : (
                  <p className="text-xs text-foreground-subtle">
                    This is the only account, so it is the default for invoices.
                  </p>
                )}

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

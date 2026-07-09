"use client";

import { useCallback, useState } from "react";

import { CurrencyDeleteModal } from "@/components/admin/currency-delete-modal";
import { CurrencyFormModal } from "@/components/admin/currency-form-modal";
import type { CurrencyListItem } from "@/lib/admin/currencies.shared";

type CurrenciesViewProps = {
  initialCurrencies: CurrencyListItem[];
  onCurrenciesChange?: (currencies: CurrencyListItem[]) => void;
  onNotice?: (message: string | null, error?: string | null) => void;
};

export function CurrenciesView({
  initialCurrencies,
  onCurrenciesChange,
  onNotice,
}: CurrenciesViewProps) {
  const [currencies, setCurrencies] = useState(initialCurrencies);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyListItem | null>(
    null,
  );
  const [deleteOpen, setDeleteOpen] = useState(false);

  const applyCurrencies = useCallback(
    (next: CurrencyListItem[]) => {
      setCurrencies(next);
      onCurrenciesChange?.(next);
    },
    [onCurrenciesChange],
  );

  const reloadCurrencies = async () => {
    const response = await fetch("/api/admin/currencies");
    const body = await response.json();
    if (!response.ok) {
      throw new Error(body.error ?? "Failed to reload currencies");
    }
    applyCurrencies(body.data.currencies as CurrencyListItem[]);
  };

  const openCreate = () => {
    setFormMode("create");
    setSelectedCurrency(null);
    setFormOpen(true);
  };

  const openEdit = (currency: CurrencyListItem) => {
    setFormMode("edit");
    setSelectedCurrency(currency);
    setFormOpen(true);
  };

  const openDelete = (currency: CurrencyListItem) => {
    setSelectedCurrency(currency);
    setDeleteOpen(true);
  };

  const handleSaved = async (currency: CurrencyListItem, message: string) => {
    try {
      await reloadCurrencies();
      onNotice?.(message, null);
    } catch {
      if (formMode === "create") {
        applyCurrencies(
          [...currencies, currency].sort((a, b) =>
            a.isoCode.localeCompare(b.isoCode),
          ),
        );
      } else {
        applyCurrencies(
          currencies.map((item) => (item.id === currency.id ? currency : item)),
        );
      }
      onNotice?.(message, null);
    }
  };

  const handleDeleted = async (message: string) => {
    try {
      await reloadCurrencies();
      onNotice?.(message, null);
    } catch {
      if (selectedCurrency) {
        applyCurrencies(currencies.filter((item) => item.id !== selectedCurrency.id));
      }
      onNotice?.(message, null);
    }
  };

  return (
    <section className="space-y-4 rounded-lg border border-border bg-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Currencies</h2>
          <p className="text-sm text-foreground-muted">
            Master list used by OpCos, reports, and invoices.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
        >
          Add currency
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-border text-foreground-subtle">
            <tr>
              <th className="px-3 py-2 font-medium">ISO</th>
              <th className="px-3 py-2 font-medium">Symbol</th>
              <th className="px-3 py-2 font-medium">Precision</th>
              <th className="px-3 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {currencies.map((currency) => (
              <tr key={currency.id} className="border-b border-border">
                <td className="px-3 py-2 font-medium text-foreground">
                  {currency.isoCode}
                </td>
                <td className="px-3 py-2 text-foreground-muted">{currency.symbol ?? "—"}</td>
                <td className="px-3 py-2 text-foreground-muted">{currency.decimalPrecision}</td>
                <td className="px-3 py-2">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => openEdit(currency)}
                      className="text-sm font-medium text-foreground-muted hover:text-foreground"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => openDelete(currency)}
                      className="text-sm font-medium text-red-600 hover:text-danger"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <CurrencyFormModal
        open={formOpen}
        mode={formMode}
        currency={selectedCurrency}
        onClose={() => setFormOpen(false)}
        onSaved={(currency, message) => void handleSaved(currency, message)}
      />

      <CurrencyDeleteModal
        open={deleteOpen}
        currency={selectedCurrency}
        onClose={() => setDeleteOpen(false)}
        onDeleted={(message) => void handleDeleted(message)}
      />
    </section>
  );
}

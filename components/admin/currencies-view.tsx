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
    <section className="space-y-4 rounded-lg border border-zinc-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">Currencies</h2>
          <p className="text-sm text-zinc-600">
            Master list used by OpCos, reports, and invoices.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          Add currency
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-zinc-200 text-zinc-500">
            <tr>
              <th className="px-3 py-2 font-medium">ISO</th>
              <th className="px-3 py-2 font-medium">Symbol</th>
              <th className="px-3 py-2 font-medium">Precision</th>
              <th className="px-3 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {currencies.map((currency) => (
              <tr key={currency.id} className="border-b border-zinc-100">
                <td className="px-3 py-2 font-medium text-zinc-900">
                  {currency.isoCode}
                </td>
                <td className="px-3 py-2 text-zinc-700">{currency.symbol ?? "—"}</td>
                <td className="px-3 py-2 text-zinc-700">{currency.decimalPrecision}</td>
                <td className="px-3 py-2">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => openEdit(currency)}
                      className="text-sm font-medium text-zinc-700 hover:text-zinc-900"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => openDelete(currency)}
                      className="text-sm font-medium text-red-600 hover:text-red-700"
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

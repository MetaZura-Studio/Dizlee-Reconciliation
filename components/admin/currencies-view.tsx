"use client";

import { useCallback, useMemo, useState } from "react";

import { CurrencyDeleteModal } from "@/components/admin/currency-delete-modal";
import { CurrencyFormModal } from "@/components/admin/currency-form-modal";
import { Button } from "@/components/ui/button";
import {
  DataTable,
  DataTableFrame,
  DataTableHead,
  DataTableRow,
  DataTableTd,
  DataTableTh,
  SortableDataTableTh,
} from "@/components/ui/data-table";
import { IconButton } from "@/components/ui/icon-button";
import { IconPencil, IconTrash } from "@/components/ui/icons";
import { PageHeader } from "@/components/ui/page";
import type { CurrencyListItem } from "@/lib/admin/currencies.shared";
import { ui } from "@/lib/ui/classes";
import { nextSortState, type SortDirection } from "@/lib/ui/sort";

type CurrencySortField = "iso" | "symbol" | "precision";

function compareCurrencies(
  a: CurrencyListItem,
  b: CurrencyListItem,
  sortBy: CurrencySortField,
  sortDir: SortDirection,
): number {
  const dir = sortDir === "asc" ? 1 : -1;
  switch (sortBy) {
    case "symbol":
      return (a.symbol ?? "").localeCompare(b.symbol ?? "") * dir;
    case "precision":
      return (a.decimalPrecision - b.decimalPrecision) * dir;
    case "iso":
    default:
      return a.isoCode.localeCompare(b.isoCode) * dir;
  }
}

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
  const [sortBy, setSortBy] = useState<CurrencySortField>("iso");
  const [sortDir, setSortDir] = useState<SortDirection>("asc");
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyListItem | null>(
    null,
  );
  const [deleteOpen, setDeleteOpen] = useState(false);

  const sortedCurrencies = useMemo(
    () =>
      [...currencies].sort((a, b) => compareCurrencies(a, b, sortBy, sortDir)),
    [currencies, sortBy, sortDir],
  );

  const applySort = (field: CurrencySortField) => {
    const next = nextSortState(sortBy, sortDir, field);
    setSortBy(next.sortBy);
    setSortDir(next.sortDir);
  };

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
    <section className={ui.cardPaddingLg}>
      <PageHeader
        title="Currencies"
        description="Master list used by OpCos, reports, and invoices."
        actions={<Button onClick={openCreate}>Add currency</Button>}
      />

      <div className="mt-6">
        <DataTableFrame>
          <DataTable>
            <DataTableHead>
              <tr>
                <SortableDataTableTh
                  label="ISO"
                  active={sortBy === "iso"}
                  direction={sortDir}
                  onSort={() => applySort("iso")}
                />
                <SortableDataTableTh
                  label="Symbol"
                  active={sortBy === "symbol"}
                  direction={sortDir}
                  onSort={() => applySort("symbol")}
                />
                <SortableDataTableTh
                  label="Precision"
                  active={sortBy === "precision"}
                  direction={sortDir}
                  onSort={() => applySort("precision")}
                />
                <DataTableTh align="right">Actions</DataTableTh>
              </tr>
            </DataTableHead>
            <tbody>
              {sortedCurrencies.map((currency) => (
                <DataTableRow key={currency.id}>
                  <DataTableTd className="font-medium text-foreground">
                    {currency.isoCode}
                  </DataTableTd>
                  <DataTableTd className="text-foreground-muted">
                    {currency.symbol ?? "—"}
                  </DataTableTd>
                  <DataTableTd className="text-foreground-muted">
                    {currency.decimalPrecision}
                  </DataTableTd>
                  <DataTableTd align="right">
                    <div className="flex justify-end gap-2">
                      <IconButton
                        label="Edit currency"
                        onClick={() => openEdit(currency)}
                      >
                        <IconPencil />
                      </IconButton>
                      <IconButton
                        label="Delete currency"
                        variant="danger"
                        onClick={() => openDelete(currency)}
                      >
                        <IconTrash />
                      </IconButton>
                    </div>
                  </DataTableTd>
                </DataTableRow>
              ))}
            </tbody>
          </DataTable>
        </DataTableFrame>
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

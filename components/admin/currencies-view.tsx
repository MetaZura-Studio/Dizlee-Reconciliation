/**
 * Manage currency lookup values used across invoices and FX rate tables.
 * List, add, edit, and delete currencies with pagination and sorting.
 */

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
import { EmptyState } from "@/components/ui/empty-state";
import { IconButton } from "@/components/ui/icon-button";
import { IconPencil, IconTrash } from "@/components/ui/icons";
import { ListPagination } from "@/components/ui/list-pagination";
import { PageHeader } from "@/components/ui/page";
import type { CurrencyListItem } from "@/lib/admin/currencies.shared";
import { paginateItems } from "@/lib/ui/list-pagination";
import { cn, ui } from "@/lib/ui/classes";
import { nextSortState, type SortDirection } from "@/lib/ui/sort";
import { formatAppError } from "@/lib/errors/format";

type CurrencySortField = "iso" | "symbol";

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
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<CurrencySortField>("iso");
  const [sortDir, setSortDir] = useState<SortDirection>("asc");
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyListItem | null>(
    null,
  );
  const [deleteOpen, setDeleteOpen] = useState(false);

  const filteredCurrencies = useMemo(() => {
    const query = search.trim().toLowerCase();
    return currencies
      .filter((currency) => {
        if (!query) {
          return true;
        }
        return (
          currency.isoCode.toLowerCase().includes(query) ||
          (currency.symbol ?? "").toLowerCase().includes(query)
        );
      })
      .sort((a, b) => compareCurrencies(a, b, sortBy, sortDir));
  }, [currencies, search, sortBy, sortDir]);

  const pagedCurrencies = useMemo(
    () => paginateItems(filteredCurrencies, page),
    [filteredCurrencies, page],
  );

  const applySort = (field: CurrencySortField) => {
    const next = nextSortState(sortBy, sortDir, field);
    setSortBy(next.sortBy);
    setSortDir(next.sortDir);
    setPage(1);
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
      throw new Error(formatAppError(body, "Failed to reload currencies"));
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

  const clearFilters = () => {
    setSearch("");
    setSortBy("iso");
    setSortDir("asc");
    setPage(1);
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
    <section className={cn(ui.card, "p-5 sm:p-6")}>
      <PageHeader
        title="Currencies"
        description="Master list of currencies available for OpCos and monthly rates. Decimal precision is set when you add or edit a currency."
        actions={<Button onClick={openCreate}>Add currency</Button>}
      />

      <div className="mt-6 space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="block min-w-[12rem] max-w-md flex-1 text-sm">
            <span className={ui.label}>Search</span>
            <input
              type="search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search by code or symbol"
              className={ui.input}
            />
          </label>
          <Button type="button" variant="secondary" onClick={clearFilters}>
            Clear filters
          </Button>
        </div>

        {filteredCurrencies.length === 0 ? (
          <EmptyState
            title={currencies.length === 0 ? "No currencies yet" : "No currencies found"}
            description={
              currencies.length === 0
                ? "Add currencies here first, then set monthly USD rates in the Monthly rates tab."
                : "No currencies match your search."
            }
          />
        ) : (
          <>
            <DataTableFrame>
              <DataTable>
                <DataTableHead>
                  <tr>
                    <SortableDataTableTh
                      label="Code"
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
                    <DataTableTh align="right">Actions</DataTableTh>
                  </tr>
                </DataTableHead>
                <tbody>
                  {pagedCurrencies.items.map((currency) => (
                    <DataTableRow key={currency.id}>
                      <DataTableTd className="font-medium text-foreground">
                        {currency.isoCode}
                      </DataTableTd>
                      <DataTableTd className="text-foreground-muted">
                        {currency.symbol ?? "—"}
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
            <ListPagination
              total={pagedCurrencies.total}
              page={pagedCurrencies.page}
              totalPages={pagedCurrencies.totalPages}
              noun="currency"
              nounPlural="currencies"
              onPageChange={setPage}
            />
          </>
        )}
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

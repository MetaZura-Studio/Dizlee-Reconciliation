"use client";

import { useCallback, useMemo, useRef, useState } from "react";

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
import { LoadingOverlay } from "@/components/ui/loading";
import { ListPagination } from "@/components/ui/list-pagination";
import { StatusPill } from "@/components/ui/status-pill";
import { useToast } from "@/components/ui/toast";
import type {
  CurrencyRatePeriodOption,
  CurrencyRatesPeriodView,
  MonthlyRateRow,
} from "@/lib/admin/currencies.shared";
import { paginateItems } from "@/lib/ui/list-pagination";
import { cn, ui } from "@/lib/ui/classes";
import { nextSortState, type SortDirection } from "@/lib/ui/sort";

type RateFormRow = {
  currencyId: string;
  isoCode: string;
  symbol: string | null;
  rateInput: string;
  isBase: boolean;
};

type RateStatusFilter = "all" | "set" | "missing";

function toFormRows(rates: MonthlyRateRow[]): RateFormRow[] {
  return rates.map((rate) => ({
    currencyId: rate.currencyId,
    isoCode: rate.isoCode,
    symbol: rate.symbol,
    rateInput:
      rate.rateToUsd === null || rate.rateToUsd === undefined
        ? ""
        : String(rate.rateToUsd),
    isBase: rate.isBase,
  }));
}

function periodKey(month: number, year: number): string {
  return `${year}-${month}`;
}

function rowHasRate(row: RateFormRow): boolean {
  return row.isBase || row.rateInput.trim() !== "";
}

function rowsEqual(a: RateFormRow[], b: RateFormRow[]): boolean {
  if (a.length !== b.length) {
    return false;
  }
  for (let i = 0; i < a.length; i += 1) {
    if (
      a[i].currencyId !== b[i].currencyId ||
      a[i].rateInput.trim() !== b[i].rateInput.trim()
    ) {
      return false;
    }
  }
  return true;
}

type CurrencyRatesSectionProps = {
  initialRates: CurrencyRatesPeriodView;
  initialPeriods: CurrencyRatePeriodOption[];
  onRatesChange?: (rates: CurrencyRatesPeriodView) => void;
  onNotice?: (message: string | null, error?: string | null) => void;
};

export function CurrencyRatesSection({
  initialRates,
  initialPeriods,
  onRatesChange,
  onNotice,
}: CurrencyRatesSectionProps) {
  const toast = useToast();
  const [periodView, setPeriodView] = useState(initialRates);
  const [periods, setPeriods] = useState<CurrencyRatePeriodOption[]>(initialPeriods);
  const [selectedKey, setSelectedKey] = useState(
    periodKey(initialRates.month, initialRates.year),
  );
  const [rows, setRows] = useState(() => toFormRows(initialRates.rates));
  const [baseline, setBaseline] = useState(() => toFormRows(initialRates.rates));
  const [search, setSearch] = useState("");
  const [rateStatus, setRateStatus] = useState<RateStatusFilter>("all");
  const [sortBy, setSortBy] = useState<"currency">("currency");
  const [sortDir, setSortDir] = useState<SortDirection>("asc");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importDraft, setImportDraft] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isCurrent = periodView.isCurrent;
  const month = periodView.month;
  const year = periodView.year;
  const isDirty = !rowsEqual(rows, baseline);

  const applyCurrencySort = () => {
    const next = nextSortState(sortBy, sortDir, "currency");
    setSortBy(next.sortBy);
    setSortDir(next.sortDir);
    setPage(1);
  };

  const applyPeriodView = useCallback(
    (view: CurrencyRatesPeriodView, options?: { draft?: boolean }) => {
      const nextRows = toFormRows(view.rates);
      setPeriodView(view);
      setSelectedKey(periodKey(view.month, view.year));
      setRows(nextRows);
      setPage(1);
      if (options?.draft) {
        setImportDraft(true);
      } else {
        setBaseline(nextRows);
        setImportDraft(false);
      }
      onRatesChange?.(view);
    },
    [onRatesChange],
  );

  const refreshPeriods = async () => {
    try {
      const response = await fetch("/api/admin/currency-rates/periods");
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error ?? "Failed to load periods");
      }
      setPeriods((body.data?.periods ?? []) as CurrencyRatePeriodOption[]);
    } catch {
      // Keep the last known period list on refresh failure.
    }
  };

  const loadPeriod = async (targetMonth: number, targetYear: number) => {
    setError(null);
    setLoading(true);

    try {
      const response = await fetch(
        `/api/admin/currency-rates?month=${targetMonth}&year=${targetYear}`,
      );
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error ?? "Failed to load currency rates");
      }
      applyPeriodView(body.data as CurrencyRatesPeriodView);
    } catch (loadError) {
      const message =
        loadError instanceof Error
          ? loadError.message
          : "Failed to load currency rates";
      setError(message);
      onNotice?.(null, message);
    } finally {
      setLoading(false);
    }
  };

  const onPeriodChange = (value: string) => {
    if (isDirty || importDraft) {
      const ok = window.confirm(
        "You have unsaved rate changes. Discard them and switch period?",
      );
      if (!ok) {
        return;
      }
    }
    setSelectedKey(value);
    const [yearPart, monthPart] = value.split("-");
    const nextYear = Number(yearPart);
    const nextMonth = Number(monthPart);
    if (Number.isInteger(nextMonth) && Number.isInteger(nextYear)) {
      void loadPeriod(nextMonth, nextYear);
    }
  };

  const saveRates = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const rates = rows.map((row) => {
        if (row.isBase) {
          return { currencyId: row.currencyId, rateToUsd: 1 };
        }

        const trimmed = row.rateInput.trim();
        if (trimmed === "") {
          return { currencyId: row.currencyId, rateToUsd: null };
        }

        const rateToUsd = Number.parseFloat(trimmed);
        if (Number.isNaN(rateToUsd)) {
          throw new Error(`Invalid rate for ${row.isoCode}`);
        }

        return { currencyId: row.currencyId, rateToUsd };
      });

      const response = await fetch("/api/admin/currency-rates", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, year, rates }),
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error ?? "Failed to save currency rates");
      }

      applyPeriodView(body.data as CurrencyRatesPeriodView);
      const message = "Monthly rates saved.";
      toast.success(message);
      void refreshPeriods();
    } catch (saveError) {
      const message =
        saveError instanceof Error
          ? saveError.message
          : "Failed to save currency rates";
      setError(message);
      onNotice?.(null, message);
    } finally {
      setSaving(false);
    }
  };

  const discardChanges = () => {
    setRows(baseline.map((row) => ({ ...row })));
    setImportDraft(false);
    setError(null);
  };

  const importExcel = async (file: File) => {
    setError(null);
    setImporting(true);

    try {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("month", String(month));
      formData.set("year", String(year));
      const response = await fetch("/api/admin/currency-rates/import", {
        method: "POST",
        body: formData,
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error ?? "Failed to import Excel file");
      }

      const data = body.data as CurrencyRatesPeriodView & {
        applied: number;
        skippedUnknown: string[];
        issues: Array<{ rowNumber: number; message: string }>;
      };

      applyPeriodView(
        {
          month: data.month,
          year: data.year,
          periodLabel: data.periodLabel,
          rates: data.rates,
          setCount: data.setCount,
          totalCurrencies: data.totalCurrencies,
          isCurrent: data.isCurrent,
        },
        { draft: true },
      );

      const parts = [
        `Loaded ${data.applied} rate${data.applied === 1 ? "" : "s"} from Excel into the form.`,
        "Review the values, then click Save rates to store them.",
      ];
      if (data.skippedUnknown.length > 0) {
        parts.push(`Skipped unknown ISO: ${data.skippedUnknown.join(", ")}.`);
      }
      if (data.issues.length > 0) {
        parts.push(`${data.issues.length} row warning(s).`);
      }
      const message = parts.join(" ");
      toast.success(message);
    } catch (importError) {
      const message =
        importError instanceof Error
          ? importError.message
          : "Failed to import Excel file";
      setError(message);
      onNotice?.(null, message);
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const busy = loading || saving || importing;
  const periodOptions =
    periods.length > 0
      ? periods
      : [
          {
            month: periodView.month,
            year: periodView.year,
            label: periodView.periodLabel,
            isCurrent: periodView.isCurrent,
          },
        ];

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = rows.filter((row) => {
      const hasRate = rowHasRate(row);
      if (rateStatus === "set" && !hasRate) {
        return false;
      }
      if (rateStatus === "missing" && hasRate) {
        return false;
      }
      if (!query) {
        return true;
      }
      return (
        row.isoCode.toLowerCase().includes(query) ||
        (row.symbol ?? "").toLowerCase().includes(query)
      );
    });

    const direction = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const byCode = a.isoCode.localeCompare(b.isoCode) * direction;
      if (byCode !== 0) {
        return byCode;
      }
      return (a.symbol ?? "").localeCompare(b.symbol ?? "") * direction;
    });
  }, [rows, search, rateStatus, sortDir]);

  const pagedRows = useMemo(
    () => paginateItems(filteredRows, page),
    [filteredRows, page],
  );

  return (
    <section className={cn(ui.card, "overflow-hidden")}>
      <div className="space-y-4 border-b border-border p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold text-foreground">
                {periodView.periodLabel}
              </h2>
              {isCurrent ? (
                <StatusPill tone="success">Current</StatusPill>
              ) : null}
              {isDirty || importDraft ? (
                <StatusPill tone="warning">Unsaved changes</StatusPill>
              ) : null}
            </div>
            <p className="text-sm text-foreground-muted">
              Enter how many KWD equal <strong>1 unit</strong> of each currency
              (example: 1 USD = 0.308 KWD).
            </p>
          </div>

          <label className="text-sm">
            <span className={ui.label}>Period</span>
            <select
              id="ratePeriod"
              value={selectedKey}
              onChange={(event) => onPeriodChange(event.target.value)}
              className={cn(ui.select, "min-w-[12rem]")}
              disabled={busy}
            >
              {periodOptions.map((period) => (
                <option
                  key={periodKey(period.month, period.year)}
                  value={periodKey(period.month, period.year)}
                >
                  {period.label}
                  {period.isCurrent ? " (current)" : ""}
                </option>
              ))}
            </select>
          </label>
        </div>

        {importDraft ? (
          <p className={ui.alertWarning}>
            Excel values are loaded into this form only. Click{" "}
            <strong>Save rates</strong> to store them.
          </p>
        ) : null}
      </div>

      <div className="space-y-4 p-5 sm:p-6">
        {error ? <p className={ui.alertError}>{error}</p> : null}
        <div className="flex flex-wrap items-end gap-3">
          <label className="min-w-[12rem] flex-1 text-sm">
            <span className={ui.label}>Search</span>
            <input
              type="search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Currency code or symbol"
              className={ui.input}
              disabled={busy || loading}
            />
          </label>
          <div className="flex rounded-2xl border border-border bg-surface-muted/40 p-1">
            {(
              [
                ["all", "All"],
                ["missing", "Missing"],
                ["set", "Set"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setRateStatus(id);
                  setPage(1);
                }}
                className={cn(
                  "rounded-xl px-3 py-1.5 text-sm font-medium transition-colors",
                  rateStatus === id
                    ? "bg-surface text-foreground shadow-[var(--shadow-sm)]"
                    : "text-foreground-muted hover:text-foreground",
                )}
                disabled={busy}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <LoadingOverlay active={loading} className="min-h-[12rem]">
        <form onSubmit={(event) => void saveRates(event)} className="space-y-4">
          {filteredRows.length === 0 ? (
            <EmptyState
              title={
                rows.length === 0
                  ? "No currencies yet"
                  : "No currencies match filters"
              }
              description={
                rows.length === 0
                  ? "Add currencies in the Currencies tab first, then set monthly rates here."
                  : "Try All, or clear your search."
              }
            />
          ) : null}

          {filteredRows.length > 0 ? (
            <>
              <DataTableFrame>
                <DataTable>
                  <DataTableHead>
                    <tr>
                      <SortableDataTableTh
                        label="Currency"
                        active={sortBy === "currency"}
                        direction={sortDir}
                        onSort={applyCurrencySort}
                      />
                      <DataTableTh>1 unit = ? KWD</DataTableTh>
                      <DataTableTh>Status</DataTableTh>
                    </tr>
                  </DataTableHead>
                  <tbody>
                    {pagedRows.items.map((row) => {
                      const missing = !rowHasRate(row);
                      return (
                        <DataTableRow
                          key={row.currencyId}
                          className={missing ? "bg-warning-muted/30" : undefined}
                        >
                          <DataTableTd className="text-foreground">
                            <span className="font-medium">{row.isoCode}</span>
                            {row.symbol ? (
                              <span className="ml-2 text-foreground-subtle">
                                {row.symbol}
                              </span>
                            ) : null}
                          </DataTableTd>
                          <DataTableTd>
                            {row.isBase ? (
                              <span className="text-foreground-muted">
                                1.00 (KWD locked)
                              </span>
                            ) : (
                              <div className="flex max-w-xs items-center gap-2">
                                <span className="shrink-0 text-xs text-foreground-subtle">
                                  1 {row.isoCode} =
                                </span>
                                <input
                                  type="number"
                                  min={0}
                                  step="0.00000001"
                                  value={row.rateInput}
                                  onChange={(event) =>
                                    setRows((current) =>
                                      current.map((item) =>
                                        item.currencyId === row.currencyId
                                          ? {
                                              ...item,
                                              rateInput: event.target.value,
                                            }
                                          : item,
                                      ),
                                    )
                                  }
                                  placeholder="Not set"
                                  className={ui.input}
                                  disabled={busy}
                                />
                                <span className="shrink-0 text-xs text-foreground-subtle">
                                  KWD
                                </span>
                              </div>
                            )}
                          </DataTableTd>
                          <DataTableTd>
                            {row.isBase ? (
                              <StatusPill tone="neutral">Locked</StatusPill>
                            ) : missing ? (
                              <StatusPill tone="warning">Missing</StatusPill>
                            ) : (
                              <StatusPill tone="success">Set</StatusPill>
                            )}
                          </DataTableTd>
                        </DataTableRow>
                      );
                    })}
                  </tbody>
                </DataTable>
              </DataTableFrame>
              <ListPagination
                total={pagedRows.total}
                page={pagedRows.page}
                totalPages={pagedRows.totalPages}
                noun="rate"
                nounPlural="rates"
                onPageChange={setPage}
              />
            </>
          ) : null}

          <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
              <Button type="submit" disabled={busy || (!isDirty && !importDraft)}>
                {saving ? "Saving…" : "Save rates"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={discardChanges}
                disabled={busy || (!isDirty && !importDraft)}
              >
                Discard
              </Button>
              <a
                href={`/api/admin/currency-rates/template?month=${month}&year=${year}`}
                className={ui.btnSecondary}
              >
                Download template
              </a>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    void importExcel(file);
                  }
                }}
              />
              <Button
                type="button"
                variant="secondary"
                disabled={busy}
                onClick={() => fileInputRef.current?.click()}
              >
                {importing ? "Importing…" : "Import Excel"}
              </Button>
              <p className="text-xs text-foreground-subtle">
                Import fills the form — you still need to Save.
              </p>
            </div>
        </form>
        </LoadingOverlay>
      </div>
    </section>
  );
}

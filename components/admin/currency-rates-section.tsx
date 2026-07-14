"use client";

import { useCallback, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DataTable,
  DataTableFrame,
  DataTableHead,
  DataTableRow,
  DataTableTd,
  DataTableTh,
} from "@/components/ui/data-table";
import { FilterToolbar } from "@/components/ui/page";
import type {
  CurrencyRatePeriodOption,
  CurrencyRatesPeriodView,
  MonthlyRateRow,
} from "@/lib/admin/currencies.shared";
import { ui } from "@/lib/ui/classes";

type RateFormRow = {
  currencyId: string;
  isoCode: string;
  symbol: string | null;
  rateInput: string;
  isUsd: boolean;
  hasRate: boolean;
};

function toFormRows(rates: MonthlyRateRow[]): RateFormRow[] {
  return rates.map((rate) => ({
    currencyId: rate.currencyId,
    isoCode: rate.isoCode,
    symbol: rate.symbol,
    rateInput:
      rate.rateToUsd === null || rate.rateToUsd === undefined
        ? ""
        : String(rate.rateToUsd),
    isUsd: rate.isUsd,
    hasRate: rate.hasRate,
  }));
}

function periodKey(month: number, year: number): string {
  return `${year}-${month}`;
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
  const [periodView, setPeriodView] = useState(initialRates);
  const [periods, setPeriods] = useState<CurrencyRatePeriodOption[]>(initialPeriods);
  const [selectedKey, setSelectedKey] = useState(
    periodKey(initialRates.month, initialRates.year),
  );
  const [rows, setRows] = useState(() => toFormRows(initialRates.rates));
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reloading, setReloading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isCurrent = periodView.isCurrent;
  const month = periodView.month;
  const year = periodView.year;

  const applyPeriodView = useCallback(
    (view: CurrencyRatesPeriodView) => {
      setPeriodView(view);
      setSelectedKey(periodKey(view.month, view.year));
      setRows(toFormRows(view.rates));
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
    setSuccess(null);
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
    if (!isCurrent) {
      return;
    }
    setError(null);
    setSuccess(null);
    setSaving(true);

    try {
      const rates = rows.map((row) => {
        if (row.isUsd) {
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
      setSuccess(message);
      onNotice?.(message, null);
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

  const reloadRates = async () => {
    setError(null);
    setSuccess(null);
    setReloading(true);

    try {
      await loadPeriod(month, year);
    } finally {
      setReloading(false);
    }
  };

  const importExcel = async (file: File) => {
    if (!isCurrent) {
      return;
    }
    setError(null);
    setSuccess(null);
    setImporting(true);

    try {
      const formData = new FormData();
      formData.set("file", file);
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

      applyPeriodView({
        month: data.month,
        year: data.year,
        periodLabel: data.periodLabel,
        rates: data.rates,
        setCount: data.setCount,
        totalCurrencies: data.totalCurrencies,
        isCurrent: true,
      });

      const parts = [
        `Applied ${data.applied} rate${data.applied === 1 ? "" : "s"} from Excel.`,
        "Review and click Save rates to store them.",
      ];
      if (data.skippedUnknown.length > 0) {
        parts.push(`Skipped unknown ISO: ${data.skippedUnknown.join(", ")}.`);
      }
      if (data.issues.length > 0) {
        parts.push(`${data.issues.length} row warning(s).`);
      }
      const message = parts.join(" ");
      setSuccess(message);
      onNotice?.(message, null);
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

  const busy = loading || saving || reloading || importing;
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

  return (
    <section className={ui.cardPaddingLg}>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-foreground">Monthly USD rates</h2>
        <p className="text-sm text-foreground-muted">
          Previous months are read-only. Only the current calendar month can be
          edited or filled from Excel.
        </p>
      </div>

      {error ? <p className={`mt-4 ${ui.alertError}`}>{error}</p> : null}
      {success ? <p className={`mt-4 ${ui.alertSuccess}`}>{success}</p> : null}

      <FilterToolbar className="mt-4">
        <div className="min-w-[16rem] space-y-1">
          <label htmlFor="ratePeriod" className={ui.label}>
            Period
          </label>
          <select
            id="ratePeriod"
            value={selectedKey}
            onChange={(event) => onPeriodChange(event.target.value)}
            className={ui.select}
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
        </div>

        <Button
          type="button"
          variant="secondary"
          onClick={() => void reloadRates()}
          disabled={busy}
        >
          {reloading || loading ? "Loading…" : "Reload"}
        </Button>
      </FilterToolbar>

      <p className="mt-4 text-sm text-foreground-muted">
        {periodView.setCount} of {periodView.totalCurrencies} currencies have rates
        for {periodView.periodLabel}
        {isCurrent ? "" : " (read-only)"}.
      </p>

      <form onSubmit={(event) => void saveRates(event)} className="mt-4 space-y-4">
        <DataTableFrame>
          <DataTable>
            <DataTableHead>
              <tr>
                <DataTableTh>Currency</DataTableTh>
                <DataTableTh>Rate to USD</DataTableTh>
              </tr>
            </DataTableHead>
            <tbody>
              {rows.map((row) => (
                <DataTableRow key={row.currencyId}>
                  <DataTableTd className="text-foreground">
                    <span className="font-medium">{row.isoCode}</span>
                    {row.symbol ? (
                      <span className="ml-2 text-foreground-subtle">{row.symbol}</span>
                    ) : null}
                  </DataTableTd>
                  <DataTableTd>
                    {row.isUsd ? (
                      <span className="text-foreground-muted">1.00000000 (locked)</span>
                    ) : isCurrent ? (
                      <input
                        type="number"
                        min={0}
                        step="0.00000001"
                        value={row.rateInput}
                        onChange={(event) =>
                          setRows((current) =>
                            current.map((item) =>
                              item.currencyId === row.currencyId
                                ? { ...item, rateInput: event.target.value }
                                : item,
                            ),
                          )
                        }
                        placeholder="Not set"
                        className={`${ui.input} max-w-xs`}
                      />
                    ) : (
                      <span className="tabular-nums text-foreground-muted">
                        {row.rateInput === "" ? "—" : row.rateInput}
                      </span>
                    )}
                  </DataTableTd>
                </DataTableRow>
              ))}
            </tbody>
          </DataTable>
        </DataTableFrame>

        {isCurrent ? (
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={busy}>
              {saving ? "Saving…" : "Save rates"}
            </Button>
            <a href="/api/admin/currency-rates/template" className={ui.btnSecondary}>
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
              {importing ? "Importing…" : "Upload Excel"}
            </Button>
          </div>
        ) : (
          <p className="text-sm text-foreground-subtle">
            Switch to the current month to edit rates or upload an Excel file.
          </p>
        )}
      </form>
    </section>
  );
}

"use client";

import { useCallback, useState } from "react";

import type {
  CurrencyRatesPeriodView,
  MonthlyRateRow,
} from "@/lib/admin/currencies.shared";

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, index) => {
  const month = index + 1;
  return {
    value: month,
    label: new Date(2026, index, 1).toLocaleString("en-US", { month: "long" }),
  };
});

function buildYearOptions(centerYear: number): number[] {
  const years: number[] = [];
  for (let year = centerYear - 3; year <= centerYear + 2; year += 1) {
    years.push(year);
  }
  return years;
}

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

type CurrencyRatesSectionProps = {
  initialRates: CurrencyRatesPeriodView;
  onRatesChange?: (rates: CurrencyRatesPeriodView) => void;
  onNotice?: (message: string | null, error?: string | null) => void;
};

export function CurrencyRatesSection({
  initialRates,
  onRatesChange,
  onNotice,
}: CurrencyRatesSectionProps) {
  const [periodView, setPeriodView] = useState(initialRates);
  const [month, setMonth] = useState(initialRates.month);
  const [year, setYear] = useState(initialRates.year);
  const [rows, setRows] = useState(() => toFormRows(initialRates.rates));
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reloading, setReloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const applyPeriodView = useCallback(
    (view: CurrencyRatesPeriodView) => {
      setPeriodView(view);
      setMonth(view.month);
      setYear(view.year);
      setRows(toFormRows(view.rates));
      onRatesChange?.(view);
    },
    [onRatesChange],
  );

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

  const saveRates = async (event: React.FormEvent) => {
    event.preventDefault();
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

  const yearOptions = buildYearOptions(year);

  return (
    <section className="space-y-4 rounded-lg border border-zinc-200 bg-white p-5">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-zinc-900">Monthly USD rates</h2>
        <p className="text-sm text-zinc-600">
          Select a past month to view or correct historical rates.
        </p>
      </div>

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

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label htmlFor="rateMonth" className="text-sm font-medium text-zinc-700">
            Month
          </label>
          <select
            id="rateMonth"
            value={month}
            onChange={(event) => setMonth(Number(event.target.value))}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
          >
            {MONTH_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label htmlFor="rateYear" className="text-sm font-medium text-zinc-700">
            Year
          </label>
          <select
            id="rateYear"
            value={year}
            onChange={(event) => setYear(Number(event.target.value))}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
          >
            {yearOptions.map((optionYear) => (
              <option key={optionYear} value={optionYear}>
                {optionYear}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={() => void loadPeriod(month, year)}
          disabled={loading || saving || reloading}
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
        >
          {loading ? "Loading…" : "Load"}
        </button>
      </div>

      <p className="text-sm text-zinc-600">
        {periodView.setCount} of {periodView.totalCurrencies} currencies have rates
        for {periodView.periodLabel}.
      </p>

      <form onSubmit={(event) => void saveRates(event)} className="space-y-4">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-zinc-200 text-zinc-500">
              <tr>
                <th className="px-3 py-2 font-medium">Currency</th>
                <th className="px-3 py-2 font-medium">Rate to USD</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.currencyId} className="border-b border-zinc-100">
                  <td className="px-3 py-2 text-zinc-900">
                    <span className="font-medium">{row.isoCode}</span>
                    {row.symbol ? (
                      <span className="ml-2 text-zinc-500">{row.symbol}</span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2">
                    {row.isUsd ? (
                      <span className="text-zinc-700">1.00000000 (locked)</span>
                    ) : (
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
                        className="w-full max-w-xs rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={saving || loading || reloading}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save rates"}
          </button>
          <button
            type="button"
            onClick={() => void reloadRates()}
            disabled={saving || loading || reloading}
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
          >
            {reloading ? "Reloading…" : "Reload"}
          </button>
        </div>
      </form>
    </section>
  );
}

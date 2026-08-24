/**
 * Excel amount/percent display helpers for export workbooks.
 * Uses Admin currency decimalPrecision (e.g. USD 2, KWD/BHD/JOD 3).
 */

import { CURRENCY_SEEDS } from "@/prisma/seed-data/currencies";

const precisionByIso = new Map(
  CURRENCY_SEEDS.map((currency) => [
    currency.isoCode.toUpperCase(),
    currency.decimalPrecision,
  ]),
);

/** Decimal places for an ISO currency code; defaults to 2 when unknown. */
export function decimalPrecisionForCurrency(isoCode: string): number {
  const precision = precisionByIso.get(isoCode.trim().toUpperCase());
  return precision === undefined ? 2 : precision;
}

/** Money with thousand separators and currency-specific fraction digits. */
export function formatExportMoney(
  value: number | null | undefined,
  currencyIsoCode: string,
): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "";
  }
  const digits = decimalPrecisionForCurrency(currencyIsoCode);
  return value.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
    useGrouping: true,
  });
}

/** Percent display with a trailing % sign (keeps meaningful decimals). */
export function formatExportPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "";
  }
  const rounded = Number(value.toFixed(2));
  const text = Number.isInteger(rounded)
    ? String(rounded)
    : String(rounded);
  return `${text}%`;
}

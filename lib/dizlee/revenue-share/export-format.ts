/**
 * Excel amount/percent display helpers for export workbooks.
 * Uses Admin currency decimalPrecision (e.g. USD 2, KWD/BHD/JOD 3).
 */

import {
  decimalPrecisionForCurrency,
  formatMoney,
} from "@/lib/platform/format-money";

export { decimalPrecisionForCurrency };

/** Money with thousand separators and currency-specific fraction digits. */
export function formatExportMoney(
  value: number | null | undefined,
  currencyIsoCode: string,
): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "";
  }
  return formatMoney(value, currencyIsoCode, {
    style: "decimal",
    empty: "",
  });
}

/** Percent display with a trailing % sign (keeps meaningful decimals). */
export function formatExportPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "";
  }
  const rounded = Number(value.toFixed(2));
  const text = Number.isInteger(rounded) ? String(rounded) : String(rounded);
  return `${text}%`;
}

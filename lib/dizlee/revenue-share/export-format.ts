/**
 * Excel amount/percent display helpers for export workbooks.
 * Uses Admin currency decimalPrecision (e.g. USD 2, KWD/BHD/JOD 3).
 */

import {
  decimalPrecisionForCurrency,
  formatMoney,
  roundMoney,
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

/** Rounded money value for Excel numeric cells (null → blank). */
export function exportMoneyNumber(
  value: number | null | undefined,
  currencyIsoCode: string,
): number | null {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return null;
  }
  return roundMoney(value, currencyIsoCode);
}

/** Excel number format for money (e.g. #,##0.00 / #,##0.000). */
export function excelMoneyNumFmt(currencyIsoCode: string): string {
  const digits = decimalPrecisionForCurrency(currencyIsoCode);
  if (digits <= 0) {
    return "#,##0";
  }
  return `#,##0.${"0".repeat(digits)}`;
}

/** Percent as a plain number (e.g. 25 for 25%), not Excel fraction. */
export function exportPercentNumber(
  value: number | null | undefined,
): number | null {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return null;
  }
  return Number(value.toFixed(2));
}

/** Show percent number with a % suffix while keeping the cell numeric. */
export const EXCEL_PERCENT_NUM_FMT = '0.00"%"';

/**
 * Money display and rounding using Admin currency decimalPrecision
 * (e.g. USD/SAR 2, KWD/BHD/JOD/OMR/IQD 3).
 */

import { CURRENCY_SEEDS } from "@/prisma/seed-data/currencies";

const precisionByIso = new Map(
  CURRENCY_SEEDS.map((currency) => [
    currency.isoCode.toUpperCase(),
    currency.decimalPrecision,
  ]),
);

const DEFAULT_PRECISION = 2;

/** Decimal places for an ISO currency code; defaults to 2 when unknown. */
export function decimalPrecisionForCurrency(isoCode: string): number {
  const precision = precisionByIso.get(isoCode.trim().toUpperCase());
  return precision === undefined ? DEFAULT_PRECISION : precision;
}

/** Round a money amount to the currency’s fraction digits. */
export function roundMoney(
  value: number,
  currencyIsoCode: string,
): number {
  if (!Number.isFinite(value)) {
    return value;
  }
  const digits = decimalPrecisionForCurrency(currencyIsoCode);
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

type FormatMoneyOptions = {
  /** currency = with symbol; decimal = digits only with grouping */
  style?: "currency" | "decimal";
  empty?: string;
};

/**
 * Format a money amount with the correct fraction digits for the currency.
 * Falls back to plain decimal when the ISO code is invalid for Intl.
 */
export function formatMoney(
  amount: number | null | undefined,
  currencyIsoCode: string,
  options: FormatMoneyOptions = {},
): string {
  const empty = options.empty ?? "—";
  if (amount === null || amount === undefined || !Number.isFinite(amount)) {
    return empty;
  }

  const iso = currencyIsoCode.trim().toUpperCase() || "USD";
  const digits = decimalPrecisionForCurrency(iso);
  const style = options.style ?? "currency";

  try {
    if (style === "decimal") {
      return amount.toLocaleString("en-US", {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
        useGrouping: true,
      });
    }
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: iso,
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(amount);
  } catch {
    return `${amount.toLocaleString("en-US", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
      useGrouping: true,
    })} ${iso}`;
  }
}

/** Convenience for USD amounts (always 2 fraction digits). */
export function formatUsd(
  amount: number | null | undefined,
  options: FormatMoneyOptions = {},
): string {
  return formatMoney(amount, "USD", options);
}

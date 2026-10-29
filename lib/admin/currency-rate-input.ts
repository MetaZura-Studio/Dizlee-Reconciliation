/**
 * Client/server helpers for FX rate text fields (avoid type=number / scientific notation).
 * Aligns with rateValueSchema: positive number, at most 8 decimal places.
 *
 * Admin enters a conversion rate (client Closing Rate sheet).
 * - Multiply currencies: rate is USD per 1 local → store as rate_to_usd as-is.
 * - Divide currencies (IQD/SDG/SSP): rate is the divisor → store rate_to_usd = 1/rate.
 * FX consumers keep using stored rateToUsd (USD per 1 local).
 */

import { currencyUsesDivideFx } from "@/lib/platform/currency-fx-factor";

export const MAX_RATE_DECIMAL_PLACES = 8;

export const CURRENT_MONTH_RATES_ONLY_MESSAGE =
  "Only the current month's rates can be edited.";

function clampDecimalPlaces(maxDecimals: number): number {
  if (!Number.isFinite(maxDecimals)) {
    return MAX_RATE_DECIMAL_PLACES;
  }
  return Math.min(
    MAX_RATE_DECIMAL_PLACES,
    Math.max(0, Math.floor(maxDecimals)),
  );
}

/** Format a rate for display/editing without scientific notation. */
export function formatRateInput(
  value: number,
  maxDecimals: number = MAX_RATE_DECIMAL_PLACES,
): string {
  if (!Number.isFinite(value)) {
    return "";
  }
  const digits = clampDecimalPlaces(maxDecimals);
  const fixed = value.toFixed(digits);
  if (!fixed.includes(".")) {
    return fixed;
  }
  return fixed.replace(/\.?0+$/, "");
}

/** Round to the same precision Zod accepts for stored `rate_to_usd` (FX needs more digits than money). */
export function roundRateToMaxDecimals(value: number): number {
  const factor = 10 ** MAX_RATE_DECIMAL_PLACES;
  return Math.round(value * factor) / factor;
}

function invertPositiveRate(value: number | null): number | null {
  if (value === null || !Number.isFinite(value) || value <= 0) {
    return null;
  }
  return 1 / value;
}

/** @deprecated Prefer adminConversionRateFromStored — kept for legacy Excel UnitsPerUSD. */
export function localPerUsdFromStoredRateToUsd(
  rateToUsd: number | null,
): number | null {
  return invertPositiveRate(rateToUsd);
}

/**
 * @deprecated Prefer storedRateToUsdFromAdminConversion — kept for legacy Excel UnitsPerUSD.
 */
export function storedRateToUsdFromLocalPerUsd(
  localPerUsd: number | null,
): number | null {
  const inverted = invertPositiveRate(localPerUsd);
  if (inverted === null) {
    return null;
  }
  return roundRateToMaxDecimals(inverted);
}

/**
 * Recover the Admin divide conversion rate after 8-dp storage.
 * 1/1520 stores as 0.00065789; naive invert is ~1520.011 — pick the
 * shortest value that round-trips to the same stored rate (prefer 1520).
 */
function recoverDivideConversionRate(rateToUsd: number): number {
  const raw = 1 / rateToUsd;
  const stored = roundRateToMaxDecimals(rateToUsd);
  for (let digits = 0; digits <= MAX_RATE_DECIMAL_PLACES; digits += 1) {
    const candidate = Number(raw.toFixed(digits));
    if (candidate <= 0) {
      continue;
    }
    if (roundRateToMaxDecimals(1 / candidate) === stored) {
      return candidate;
    }
  }
  return roundRateToMaxDecimals(raw);
}

/**
 * Stored rateToUsd (USD per 1 local) → Admin conversion-rate field.
 * Multiply: show rate as-is. Divide: show divisor (1 / rateToUsd),
 * recovered so 1520 does not reappear as 1520.011 after save.
 */
export function adminConversionRateFromStored(
  rateToUsd: number | null,
  isoCode: string,
): number | null {
  if (rateToUsd === null || !Number.isFinite(rateToUsd) || rateToUsd <= 0) {
    return null;
  }
  if (currencyUsesDivideFx(isoCode)) {
    return recoverDivideConversionRate(rateToUsd);
  }
  return rateToUsd;
}

/**
 * Admin conversion-rate field → stored rateToUsd (USD per 1 local).
 * Multiply: store as-is. Divide: store 1 / entered rate.
 */
export function storedRateToUsdFromAdminConversion(
  conversionRate: number | null,
  isoCode: string,
): number | null {
  if (
    conversionRate === null ||
    !Number.isFinite(conversionRate) ||
    conversionRate <= 0
  ) {
    return null;
  }
  if (currencyUsesDivideFx(isoCode)) {
    return roundRateToMaxDecimals(1 / conversionRate);
  }
  return roundRateToMaxDecimals(conversionRate);
}

export {
  currencyFxFactor,
  currencyFxFactorLabel,
  currencyUsesDivideFx,
} from "@/lib/platform/currency-fx-factor";

/**
 * Allow digits and a single decimal point; cap fraction length (default 8 for FX storage,
 * or the currency’s money decimals for Admin conversion-rate input).
 * Empty string and trailing "." are kept so the user can keep typing.
 */
export function sanitizeRateInput(
  raw: string,
  maxDecimals: number = MAX_RATE_DECIMAL_PLACES,
): string {
  const digits = clampDecimalPlaces(maxDecimals);
  const cleaned = raw.replace(/[^\d.]/g, "");
  const firstDot = cleaned.indexOf(".");
  let normalized =
    firstDot === -1
      ? cleaned
      : cleaned.slice(0, firstDot + 1) +
        cleaned.slice(firstDot + 1).replace(/\./g, "");

  if (normalized.startsWith(".")) {
    normalized = `0${normalized}`;
  }

  const dot = normalized.indexOf(".");
  if (dot === -1) {
    return normalized;
  }

  const whole = normalized.slice(0, dot);
  const fraction = normalized.slice(dot + 1).slice(0, digits);
  return `${whole}.${fraction}`;
}

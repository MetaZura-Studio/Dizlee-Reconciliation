/**
 * Client/server helpers for FX rate text fields (avoid type=number / scientific notation).
 * Aligns with rateValueSchema: positive number, at most 8 decimal places.
 *
 * Admin UI shows local units per 1 USD; DB still stores `rate_to_usd` (USD per 1 local).
 * Invert only at Admin boundaries — FX consumers keep using stored rateToUsd.
 */

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

/** Stored rateToUsd (USD per 1 local) → Admin display (local per 1 USD). */
export function localPerUsdFromStoredRateToUsd(
  rateToUsd: number | null,
): number | null {
  return invertPositiveRate(rateToUsd);
}

/**
 * Admin input (local per 1 USD) → stored rateToUsd (USD per 1 local).
 * Rounds to 8 decimals so values like 1 USD = 2.76 SDG pass validation
 * (raw 1/2.76 is a repeating decimal).
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
 * Allow digits and a single decimal point; cap fraction length (default 8 for FX storage,
 * or the currency’s money decimals for Admin “1 USD = ? local” input).
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

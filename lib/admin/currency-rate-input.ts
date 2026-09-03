/**
 * Client/server helpers for FX rate text fields (avoid type=number / scientific notation).
 * Aligns with rateValueSchema: positive number, at most 8 decimal places.
 */

export const MAX_RATE_DECIMAL_PLACES = 8;

export const CURRENT_MONTH_RATES_ONLY_MESSAGE =
  "Only the current month's rates can be edited.";

/** Format a stored rate for display/editing without scientific notation. */
export function formatRateInput(value: number): string {
  if (!Number.isFinite(value)) {
    return "";
  }
  const fixed = value.toFixed(MAX_RATE_DECIMAL_PLACES);
  if (!fixed.includes(".")) {
    return fixed;
  }
  return fixed.replace(/\.?0+$/, "");
}

/**
 * Allow digits and a single decimal point; cap fraction length at MAX_RATE_DECIMAL_PLACES.
 * Empty string and trailing "." are kept so the user can keep typing.
 */
export function sanitizeRateInput(raw: string): string {
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
  const fraction = normalized.slice(dot + 1).slice(0, MAX_RATE_DECIMAL_PLACES);
  return `${whole}.${fraction}`;
}

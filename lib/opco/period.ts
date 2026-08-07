/**
 * OpCo dashboard period parsing and display helpers.
 *
 * Portal: OpCo. URL query params are sanitized with bounded fallbacks; selected
 * year/month is clamped to the present via `@/lib/platform/period` (no future periods).
 */

import { clampPeriodToPresent } from "@/lib/platform/period";

export type Period = {
  year: number;
  month: number;
};

export function getDefaultPeriod(date = new Date()): Period {
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
  };
}

export function parsePeriodParam(
  value: string | undefined,
  fallback: number,
  min: number,
  max: number,
): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);

  if (Number.isNaN(parsed) || parsed < min || parsed > max) {
    return fallback;
  }

  return parsed;
}

/** Parses dashboard `year` / `month` query params and clamps to the present period. */
export function parseDashboardPeriod(
  yearParam?: string,
  monthParam?: string,
  date = new Date(),
): Period {
  const defaults = getDefaultPeriod(date);

  const year = parsePeriodParam(yearParam, defaults.year, 2000, 2100);
  const month = parsePeriodParam(monthParam, defaults.month, 1, 12);
  return clampPeriodToPresent(year, month, date);
}

export function formatPeriodLabel(year: number, month: number): string {
  return new Date(year, month - 1, 1).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });
}

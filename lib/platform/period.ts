export type Period = {
  year: number;
  month: number;
};

export function getCurrentPeriod(date = new Date()): Period {
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
  };
}

/** True when (year, month) is after the current calendar month. */
export function isFuturePeriod(
  year: number,
  month: number,
  date = new Date(),
): boolean {
  const current = getCurrentPeriod(date);
  return (
    year > current.year || (year === current.year && month > current.month)
  );
}

/**
 * Selectable years for period pickers: current year down through `yearsBack`.
 * Never includes future years.
 */
export function getPeriodYearOptions(
  date = new Date(),
  yearsBack = 4,
): number[] {
  const currentYear = date.getFullYear();
  const options: number[] = [];
  for (let value = currentYear; value >= currentYear - yearsBack; value -= 1) {
    options.push(value);
  }
  return options;
}

/** @deprecated Prefer getPeriodYearOptions */
export const getUploadYearOptions = getPeriodYearOptions;

/**
 * Latest selectable month for a year (12 for past years; current month for
 * this year; 0 if year is in the future).
 */
export function getMaxMonthForYear(year: number, date = new Date()): number {
  const current = getCurrentPeriod(date);
  if (year > current.year) {
    return 0;
  }
  if (year < current.year) {
    return 12;
  }
  return current.month;
}

/** @deprecated Prefer getMaxMonthForYear */
export const getMaxUploadMonthForYear = getMaxMonthForYear;

/** Clamp a period so it is never after the current calendar month. */
export function clampPeriodToPresent(
  year: number,
  month: number,
  date = new Date(),
): Period {
  const current = getCurrentPeriod(date);
  if (year > current.year) {
    return current;
  }
  if (year === current.year && month > current.month) {
    return { year, month: current.month };
  }
  return { year, month };
}

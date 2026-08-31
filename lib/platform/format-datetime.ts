/**
 * App-wide date and timestamp formatting.
 * Dates: dd/mm/yy · Timestamps: dd/mm/yy, HH:mm (24-hour).
 */

const EMPTY = "—";

const DATE_PARTS: Intl.DateTimeFormatOptions = {
  day: "2-digit",
  month: "2-digit",
  year: "2-digit",
};

const TIME_PARTS: Intl.DateTimeFormatOptions = {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
};

function parseDate(value: string | Date | null | undefined): Date | null {
  if (value == null || value === "") {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** dd/mm/yy — e.g. 28/08/26 */
export function formatAppDate(value: string | Date | null | undefined): string {
  const date = parseDate(value);
  if (!date) {
    return EMPTY;
  }
  return date.toLocaleDateString("en-GB", DATE_PARTS);
}

/** dd/mm/yy, HH:mm — e.g. 28/08/26, 14:30 */
export function formatAppDateTime(
  value: string | Date | null | undefined,
): string {
  const date = parseDate(value);
  if (!date) {
    return EMPTY;
  }
  const datePart = date.toLocaleDateString("en-GB", DATE_PARTS);
  const timePart = date.toLocaleTimeString("en-GB", TIME_PARTS);
  return `${datePart}, ${timePart}`;
}

/** mm/yyyy — e.g. 08/2026 for period columns */
export function formatAppMonthYear(month: number, year: number): string {
  if (
    !Number.isInteger(month) ||
    !Number.isInteger(year) ||
    month < 1 ||
    month > 12
  ) {
    return EMPTY;
  }
  const monthPart = String(month).padStart(2, "0");
  return `${monthPart}/${year}`;
}

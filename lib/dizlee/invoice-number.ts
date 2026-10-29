/**
 * Dizlee → OpCo invoice numbering: API-[seq]-[Mon][YY]-[OpCo Name]
 * Example: API-81-Oct26-Zain Kuwait
 */

const MONTH_ABBR = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

/** Max length of `invoices.invoice_number` (schema VARCHAR(64)). */
export const DIZLEE_INVOICE_NUMBER_MAX_LEN = 64;

export function formatInvoicePeriodToken(month: number, year: number): string {
  const abbr = MONTH_ABBR[month - 1];
  if (!abbr || !Number.isInteger(year)) {
    throw new Error("Invalid invoice period for invoice number");
  }
  const yy = String(year % 100).padStart(2, "0");
  return `${abbr}${yy}`;
}

/** Parse sequential number from an API-prefixed invoice number, or null. */
export function parseDizleeOpcoInvoiceSequence(
  invoiceNumber: string | null | undefined,
): number | null {
  if (!invoiceNumber) {
    return null;
  }
  const match = /^API-(\d+)-/i.exec(invoiceNumber.trim());
  if (!match) {
    return null;
  }
  const seq = Number.parseInt(match[1] ?? "", 10);
  return Number.isFinite(seq) && seq > 0 ? seq : null;
}

/**
 * Build Dizlee→OpCo invoice number.
 * Truncates OpCo name so the full string fits VARCHAR(64).
 */
export function formatDizleeOpcoInvoiceNumber(params: {
  sequence: number;
  month: number;
  year: number;
  opcoName: string;
}): string {
  if (!Number.isInteger(params.sequence) || params.sequence < 1) {
    throw new Error("Invoice sequence must be a positive integer");
  }
  const period = formatInvoicePeriodToken(params.month, params.year);
  const prefix = `API-${params.sequence}-${period}-`;
  const maxNameLen = DIZLEE_INVOICE_NUMBER_MAX_LEN - prefix.length;
  const name = params.opcoName.trim().replace(/\s+/g, " ");
  if (!name) {
    throw new Error("OpCo name is required for invoice number");
  }
  const clipped =
    maxNameLen > 0 ? name.slice(0, maxNameLen).trimEnd() : name.slice(0, 1);
  return `${prefix}${clipped}`;
}

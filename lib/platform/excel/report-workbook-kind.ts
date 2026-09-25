/**
 * Fingerprint Excel headers to tell OpCo vs Partner report templates apart.
 * Used before portal-specific parse so wrong-portal uploads get a clear 400.
 */

import ExcelJS from "exceljs";

import { DomainError } from "@/lib/errors/app-error";
import { assertSafeXlsxZip } from "@/lib/platform/excel/assert-safe-xlsx-zip";

export type ReportWorkbookKind = "opco" | "partner" | "unknown";

/** User-facing copy when the uploaded Excel is the wrong portal template. */
export const WRONG_REPORT_FORMAT_MESSAGE = "Format is incorrect.";

/** @deprecated Use WRONG_REPORT_FORMAT_MESSAGE */
export const WRONG_REPORT_TYPE_FOR_PARTNER = WRONG_REPORT_FORMAT_MESSAGE;

/** @deprecated Use WRONG_REPORT_FORMAT_MESSAGE */
export const WRONG_REPORT_TYPE_FOR_OPCO = WRONG_REPORT_FORMAT_MESSAGE;

export class WrongReportTypeError extends DomainError {
  constructor(message: string = WRONG_REPORT_FORMAT_MESSAGE) {
    super("WrongReportTypeError", message, 400);
  }
}

const HEADER_SCAN_MAX_ROWS = 20;

/** Strong OpCo monthly / performance-sheet signals. */
const OPCO_EXACT = new Set([
  "originalamount",
  "original_amount",
  "vendorname",
  "zain_amount",
  "applicationname",
  "billingcycle",
  "partnerid",
  "referenceid",
  "dizlee_share",
  "bango_share",
  "sp_share",
  "net_after_cmc",
  "sp_revenue",
  "bango_revenue",
  "dizlee_revenue",
]);

/** Partner template signals (without strong OpCo markers). */
const PARTNER_EXACT = new Set([
  "gross_amount",
  "gross_amount_lc",
  "gross_amount_usd",
  "merchant",
  "usage_amount",
  "usage_usd",
  "usageamount",
  "usageusd",
  // Per-row currency column (any of these strengthens Partner fingerprint).
  "local_currency_lc",
  "local_currency",
  "currency",
]);

function normalizeHeaderKey(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .replace(/[()]/g, "")
    .replace(/[/\\]+/g, "_")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

function cellText(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "object" && "text" in value && typeof value.text === "string") {
    return value.text.trim();
  }
  return String(value).trim();
}

function headersFromRow(row: ExcelJS.Row): string[] {
  const headers: string[] = [];
  row.eachCell({ includeEmpty: false }, (cell) => {
    const text = cellText(cell.value);
    if (text) {
      headers.push(normalizeHeaderKey(text));
    }
  });
  return headers;
}

function scoreHeaderRow(headers: string[]): number {
  if (headers.length === 0) {
    return 0;
  }
  if (headers.length === 1 && (headers[0]?.length ?? 0) > 40) {
    return 1;
  }
  return headers.length * 10;
}

function isOpcoSignal(header: string): boolean {
  if (OPCO_EXACT.has(header)) {
    return true;
  }
  return (
    header.startsWith("service_revenue") ||
    header.startsWith("applicationname") ||
    header.includes("originalamount") ||
    (header.endsWith("_share") &&
      (header.includes("dizlee") ||
        header.includes("bango") ||
        header.includes("sp_")))
  );
}

function isPartnerSignal(header: string): boolean {
  return PARTNER_EXACT.has(header);
}

function classifyHeaders(headers: string[]): ReportWorkbookKind {
  let opcoScore = 0;
  let partnerScore = 0;

  for (const header of headers) {
    if (isOpcoSignal(header)) {
      opcoScore += 1;
    }
    if (isPartnerSignal(header)) {
      partnerScore += 1;
    }
  }

  if (opcoScore > 0 && opcoScore >= partnerScore) {
    return "opco";
  }
  if (partnerScore > 0 && partnerScore > opcoScore) {
    return "partner";
  }
  return "unknown";
}

/**
 * Load workbook and classify by the strongest header row across sheets.
 */
export async function detectReportWorkbookKind(
  input: ArrayBuffer | Buffer,
): Promise<ReportWorkbookKind> {
  const workbook = new ExcelJS.Workbook();
  const workbookBuffer = Buffer.isBuffer(input) ? input : Buffer.from(input);
  const zipError = assertSafeXlsxZip(workbookBuffer);
  if (zipError) {
    return "unknown";
  }

  await workbook.xlsx.load(workbookBuffer as unknown as ExcelJS.Buffer);

  let bestKind: ReportWorkbookKind = "unknown";
  let bestScore = 0;

  for (const worksheet of workbook.worksheets) {
    const maxRow = Math.min(worksheet.rowCount || HEADER_SCAN_MAX_ROWS, HEADER_SCAN_MAX_ROWS);
    for (let rowNumber = 1; rowNumber <= maxRow; rowNumber += 1) {
      const headers = headersFromRow(worksheet.getRow(rowNumber));
      const rowScore = scoreHeaderRow(headers);
      if (rowScore < 20) {
        continue;
      }
      const kind = classifyHeaders(headers);
      if (kind === "unknown") {
        continue;
      }
      // Prefer clearer fingerprints (more signals + denser header row).
      const kindBoost = kind === "opco" || kind === "partner" ? 5 : 0;
      const total = rowScore + kindBoost;
      if (total > bestScore) {
        bestScore = total;
        bestKind = kind;
      }
    }
  }

  return bestKind;
}

export async function assertPartnerPortalReportWorkbook(
  input: ArrayBuffer | Buffer,
): Promise<void> {
  const kind = await detectReportWorkbookKind(input);
  if (kind === "opco") {
    throw new WrongReportTypeError();
  }
}

export async function assertOpcoPortalReportWorkbook(
  input: ArrayBuffer | Buffer,
): Promise<void> {
  const kind = await detectReportWorkbookKind(input);
  if (kind === "partner") {
    throw new WrongReportTypeError();
  }
}

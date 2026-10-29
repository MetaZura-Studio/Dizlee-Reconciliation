/**
 * Raw first-sheet Excel grid reader for upload preview (display strings, row/column caps).
 */
import ExcelJS from "exceljs";

import {
  formatAppDate,
  formatAppDateTime,
} from "@/lib/platform/format-datetime";
import { assertSafeXlsxZip } from "@/lib/platform/excel/assert-safe-xlsx-zip";
import {
  hasLiteralPercentSuffix,
  isExcelFractionalPercentFmt,
} from "@/lib/platform/excel/percent-format";

const MAX_PREVIEW_ROWS = 1000;
const MAX_PREVIEW_COLS = 80;

function formatExcelDate(value: Date): string {
  const hasTime =
    value.getUTCHours() !== 0 ||
    value.getUTCMinutes() !== 0 ||
    value.getUTCSeconds() !== 0 ||
    value.getUTCMilliseconds() !== 0;
  return hasTime ? formatAppDateTime(value) : formatAppDate(value);
}

function numericFromCellValue(value: ExcelJS.CellValue): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (value && typeof value === "object" && "result" in value) {
    const result = (value as ExcelJS.CellFormulaValue).result;
    if (typeof result === "number" && Number.isFinite(result)) {
      return result;
    }
  }
  return null;
}

/** Format a displayed percent number with a % sign (63 → "63%"). */
function formatWholePercentDisplay(displayed: number): string {
  const rounded = Math.round(displayed * 1e10) / 1e10;
  const text =
    Number.isInteger(rounded) ||
    Math.abs(rounded - Math.round(rounded)) < 1e-9
      ? String(Math.round(rounded))
      : String(rounded);
  return `${text}%`;
}

/** Format Excel percent fractions as humans see them (0.03 → "3%"). */
function formatPercentDisplay(fraction: number): string {
  return formatWholePercentDisplay(fraction * 100);
}

/**
 * True when the column itself is a percent value (e.g. "Dizlee Share %", "RS %").
 * False for amount columns that only mention a rate (e.g. "TRC GOV Share (6%)").
 */
function headerLooksLikePercent(header: string): boolean {
  const lower = header.trim().toLowerCase();
  if (/%\s*$/.test(lower)) {
    return true;
  }
  if (/\b(rs|revenue\s*share|dizlee\s*share)\s*%/.test(lower)) {
    return true;
  }
  if (/\b(percent|pct)\b/.test(lower) && !/\([^)]*%[^)]*\)/.test(lower)) {
    return true;
  }
  return false;
}

/** Decimal places from Excel number formats like `0.0`, `#,##0.00`. */
function decimalPlacesFromNumFmt(numFmt: string): number | null {
  if (!numFmt.trim()) {
    return null;
  }
  const main = numFmt.split(";")[0]?.replace(/\[[^\]]*\]/g, "") ?? "";
  if (!main || isExcelFractionalPercentFmt(main) || hasLiteralPercentSuffix(main)) {
    return null;
  }
  const match = main.match(/\.([0#]+)/);
  if (match) {
    return match[1].length;
  }
  if (/[0#]/.test(main)) {
    return 0;
  }
  return null;
}

function usesThousandSeparators(numFmt: string): boolean {
  return /#,\s*#|#,#/.test(numFmt);
}

/**
 * Display numbers like Excel: honor numFmt decimals, else strip float noise
 * (18.368999999999996 → 18.4 when fmt is 0.0).
 */
function formatNumberForPreview(value: number, numFmt: string): string {
  if (!Number.isFinite(value)) {
    return String(value);
  }

  const decimals = decimalPlacesFromNumFmt(numFmt);
  if (decimals !== null) {
    const fixed = value.toFixed(decimals);
    if (usesThousandSeparators(numFmt)) {
      const asNumber = Number(fixed);
      return asNumber.toLocaleString("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
    }
    return fixed;
  }

  if (Number.isInteger(value)) {
    return String(value);
  }
  // Clean IEEE float noise; keep meaningful decimals, drop trailing zeros.
  const cleaned = parseFloat(value.toFixed(10));
  return String(cleaned);
}

function cellToDisplay(
  cell: ExcelJS.Cell,
  options?: { treatAsPercentColumn?: boolean },
): string {
  const value = cell.value;
  if (value === null || value === undefined) {
    return "";
  }

  const numFmt = String(cell.numFmt ?? "");
  const isPercentFmt = isExcelFractionalPercentFmt(numFmt);
  const numeric = numericFromCellValue(value);
  // Only Excel fractional % formats store 0.03 for "3%". Bare numbers in a
  // percent-named column are already display percents (0.50 → 0.50%).
  if (numeric !== null && isPercentFmt) {
    return formatPercentDisplay(numeric);
  }

  // RS Excel stores whole percents (63) with a quoted "%" suffix in numFmt.
  // Same for bare values in a percent-named OpCo column.
  if (
    numeric !== null &&
    (hasLiteralPercentSuffix(numFmt) || options?.treatAsPercentColumn)
  ) {
    return formatWholePercentDisplay(numeric);
  }

  if (numeric !== null) {
    return formatNumberForPreview(numeric, numFmt);
  }

  if (typeof value === "string" || typeof value === "boolean") {
    return String(value);
  }
  if (value instanceof Date) {
    return formatExcelDate(value);
  }
  if (typeof value === "object") {
    if ("text" in value && typeof value.text === "string") {
      return value.text;
    }
    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText.map((part) => part.text ?? "").join("");
    }
  }
  return String(value);
}

function isBlankCell(value: string): boolean {
  return value.trim() === "";
}

function rowHasData(cells: string[]): boolean {
  return cells.some((cell) => !isBlankCell(cell));
}

function trimTrailingEmptyColumns(rows: string[][]): string[][] {
  let maxCol = 0;
  for (const row of rows) {
    for (let index = row.length - 1; index >= 0; index -= 1) {
      if (!isBlankCell(row[index] ?? "")) {
        maxCol = Math.max(maxCol, index + 1);
        break;
      }
    }
  }

  if (maxCol === 0) {
    return [];
  }

  return rows.map((row) => {
    const next = row.slice(0, maxCol);
    while (next.length < maxCol) {
      next.push("");
    }
    return next;
  });
}

export type RawExcelSheetPreview = {
  sheetName: string;
  rows: string[][];
  totalRows: number;
  truncated: boolean;
};

/** Read a worksheet as raw display cells (no report-schema mapping). */
export async function readRawExcelSheetPreview(
  source: ArrayBuffer | Buffer | Uint8Array,
  preferredSheetName?: string | null,
): Promise<RawExcelSheetPreview> {
  const buffer = Buffer.isBuffer(source)
    ? source
    : Buffer.from(source as ArrayBuffer);
  const zipError = assertSafeXlsxZip(buffer);
  if (zipError) {
    throw new Error(zipError);
  }
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  const preferred = preferredSheetName?.trim();
  const sheet =
    (preferred
      ? workbook.getWorksheet(preferred) ??
        workbook.worksheets.find(
          (item) => item.name.trim().toLowerCase() === preferred.toLowerCase(),
        )
      : undefined) ?? workbook.worksheets[0];

  if (!sheet) {
    throw new Error("Workbook has no sheets");
  }

  const sheetRowCount = sheet.actualRowCount || sheet.rowCount || 0;
  const truncated = sheetRowCount > MAX_PREVIEW_ROWS;
  const limit = Math.min(sheetRowCount, MAX_PREVIEW_ROWS);
  const dataRows: string[][] = [];

  const headerRow = sheet.getRow(1);
  const headerColCount = Math.min(
    Math.max(
      headerRow.cellCount || 0,
      sheet.actualColumnCount || sheet.columnCount || 0,
    ),
    MAX_PREVIEW_COLS,
  );
  const percentColumns = new Set<number>();
  for (let col = 1; col <= headerColCount; col += 1) {
    const headerText = cellToDisplay(headerRow.getCell(col));
    if (headerLooksLikePercent(headerText)) {
      percentColumns.add(col);
    }
  }

  for (let rowNumber = 1; rowNumber <= limit; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    const cells: string[] = [];
    const colCount = Math.min(
      Math.max(row.cellCount || 0, sheet.actualColumnCount || sheet.columnCount || 0),
      MAX_PREVIEW_COLS,
    );
    for (let col = 1; col <= colCount; col += 1) {
      cells.push(
        cellToDisplay(row.getCell(col), {
          treatAsPercentColumn:
            rowNumber > 1 && percentColumns.has(col),
        }),
      );
    }
    if (rowHasData(cells)) {
      dataRows.push(cells);
    }
  }

  const rows = trimTrailingEmptyColumns(dataRows);

  return {
    sheetName: sheet.name || "Sheet1",
    rows,
    totalRows: rows.length,
    truncated,
  };
}

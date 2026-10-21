/**
 * Extract header rows from OpCo sample Excel for Admin column mapping.
 * Column titles are always read from row 1 on each sheet.
 * Multi-sheet workbooks are catalogued so Admin can pick the tab first.
 */
import ExcelJS from "exceljs";

function cellText(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "object" && "text" in value && typeof value.text === "string") {
    return value.text.trim();
  }
  if (typeof value === "object" && "result" in value) {
    return String(value.result ?? "").trim();
  }
  return String(value).trim();
}

/** Preserve first occurrence; Excel samples can repeat the same header label. */
export function uniqueHeaders(headers: string[]): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const header of headers) {
    const trimmed = header.trim();
    if (!trimmed || seen.has(trimmed)) {
      continue;
    }
    seen.add(trimmed);
    unique.push(trimmed);
  }
  return unique;
}

export function normalizeHeaderKey(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .replace(/[()]/g, "")
    .replace(/[/\\]+/g, "_")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

export type ExcelHeaderScanResult = {
  headers: string[];
  sheetName: string;
  headerRowNumber: number;
};

/** OpCo report samples always put column titles on row 1. */
export const OPCO_REPORT_HEADER_ROW = 1;

export function headersFromRow(row: ExcelJS.Row): string[] {
  const headers: string[] = [];
  row.eachCell({ includeEmpty: false }, (cell) => {
    const text = cellText(cell.value);
    if (text) {
      headers.push(text);
    }
  });
  return uniqueHeaders(headers);
}

/** True when a cell looks like report data, not a column title. */
export function looksLikeDataHeaderCell(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) {
    return false;
  }
  if (/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(trimmed)) {
    return true;
  }
  // ExcelJS Date → String(date) includes weekday / GMT / timezone.
  if (
    /\bGMT[+-]?\d*\b/i.test(trimmed) ||
    /\b(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\b/i.test(trimmed)
  ) {
    return true;
  }
  const asDate = Date.parse(trimmed);
  if (
    Number.isFinite(asDate) &&
    /^\d{4}-\d{2}-\d{2}/.test(trimmed)
  ) {
    return true;
  }
  return false;
}

/**
 * Prefer real column-title grids over:
 * - a single long title cell on Summary sheets
 * - dense data rows that beat the header only because they have more filled cells
 *   (e.g. extra formula columns with no header label)
 */
export function scoreHeaderRow(headers: string[]): number {
  if (headers.length === 0) {
    return 0;
  }
  if (headers.length === 1 && (headers[0]?.length ?? 0) > 40) {
    return 1;
  }
  let score = headers.length * 10;
  let dataLike = 0;
  for (const header of headers) {
    if (looksLikeDataHeaderCell(header)) {
      dataLike += 1;
      score -= 12;
      continue;
    }
    if (header.length <= 60) {
      score += 2;
    }
  }
  // Mostly numbers/dates → almost certainly a data row, not headers.
  if (headers.length >= 3 && dataLike / headers.length >= 0.4) {
    score = Math.min(score, headers.length);
  }
  return score;
}

/** Always read column titles from row 1 (all OpCo reports use that convention). */
export function scanSheetForHeaders(
  sheet: ExcelJS.Worksheet,
): ExcelHeaderScanResult | null {
  const headers = headersFromRow(sheet.getRow(OPCO_REPORT_HEADER_ROW));
  if (headers.length === 0) {
    return null;
  }
  return {
    headers,
    sheetName: sheet.name,
    headerRowNumber: OPCO_REPORT_HEADER_ROW,
  };
}

/** Best header row for every worksheet (including empty-header sheets). */
export function listWorkbookSheetHeaderScans(
  workbook: ExcelJS.Workbook,
): ExcelHeaderScanResult[] {
  const scans: ExcelHeaderScanResult[] = [];
  for (const sheet of workbook.worksheets) {
    const scan = scanSheetForHeaders(sheet);
    scans.push(
      scan ?? {
        headers: [],
        sheetName: sheet.name,
        headerRowNumber: 1,
      },
    );
  }
  return scans;
}

export function pickBestHeaderScan(
  scans: ExcelHeaderScanResult[],
): ExcelHeaderScanResult | null {
  let best: ExcelHeaderScanResult | null = null;
  let bestScore = 0;
  for (const scan of scans) {
    const score = scoreHeaderRow(scan.headers);
    if (score > bestScore) {
      bestScore = score;
      best = scan;
    }
  }
  return best;
}

export function scanWorkbookForHeaders(
  workbook: ExcelJS.Workbook,
): ExcelHeaderScanResult | null {
  return pickBestHeaderScan(listWorkbookSheetHeaderScans(workbook));
}

function headerRowMatchesNeeded(
  sheet: ExcelJS.Worksheet,
  rowNumber: number,
  needed: string[],
): boolean {
  if (needed.length === 0) {
    return false;
  }
  const headers = headersFromRow(sheet.getRow(rowNumber)).map(normalizeHeaderKey);
  return needed.every((need) =>
    headers.some(
      (header) =>
        header === need ||
        header.startsWith(`${need}_`) ||
        need.startsWith(`${header}_`),
    ),
  );
}

/**
 * Prefer Admin-configured sheet, then a sheet whose header row matches mapped
 * columns, then the richest header scan.
 */
export function findWorksheetMatchingHeaders(
  workbook: ExcelJS.Workbook,
  requiredHeaders: Array<string | null | undefined>,
  preferredSheetName?: string | null,
): { worksheet: ExcelJS.Worksheet; headerRowNumber: number } | null {
  const needed = requiredHeaders
    .map((header) => header?.trim())
    .filter((header): header is string => Boolean(header))
    .map(normalizeHeaderKey);

  const preferredName = preferredSheetName?.trim();
  if (preferredName) {
    const preferred =
      workbook.getWorksheet(preferredName) ??
      workbook.worksheets.find(
        (sheet) => sheet.name.trim().toLowerCase() === preferredName.toLowerCase(),
      );
    if (preferred) {
      const scan = scanSheetForHeaders(preferred);
      if (scan && (needed.length === 0 || headerRowMatchesNeeded(preferred, scan.headerRowNumber, needed))) {
        return {
          worksheet: preferred,
          headerRowNumber: scan.headerRowNumber,
        };
      }
      if (scan) {
        // Still use preferred sheet even if columns drifted; findColumn will error clearly.
        return {
          worksheet: preferred,
          headerRowNumber: scan.headerRowNumber,
        };
      }
    }
  }

  if (needed.length > 0) {
    for (const sheet of workbook.worksheets) {
      if (headerRowMatchesNeeded(sheet, OPCO_REPORT_HEADER_ROW, needed)) {
        return {
          worksheet: sheet,
          headerRowNumber: OPCO_REPORT_HEADER_ROW,
        };
      }
    }
  }

  const scan = scanWorkbookForHeaders(workbook);
  if (!scan) {
    return null;
  }
  const worksheet = workbook.getWorksheet(scan.sheetName);
  if (!worksheet) {
    return null;
  }
  return { worksheet, headerRowNumber: scan.headerRowNumber };
}

export type WorkbookHeaderCatalog = {
  selected: ExcelHeaderScanResult;
  sheets: ExcelHeaderScanResult[];
};

export async function extractExcelHeaderCatalog(
  buffer: ArrayBuffer | Buffer | Uint8Array,
): Promise<WorkbookHeaderCatalog | null> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  const sheets = listWorkbookSheetHeaderScans(workbook);
  const selected = pickBestHeaderScan(sheets);
  if (!selected || selected.headers.length === 0) {
    return null;
  }
  return { selected, sheets };
}

export async function extractExcelHeaderScan(
  buffer: ArrayBuffer | Buffer | Uint8Array,
): Promise<ExcelHeaderScanResult | null> {
  const catalog = await extractExcelHeaderCatalog(buffer);
  return catalog?.selected ?? null;
}

export async function extractExcelHeaders(
  buffer: ArrayBuffer | Buffer | Uint8Array,
): Promise<string[]> {
  const scan = await extractExcelHeaderScan(buffer);
  return scan?.headers ?? [];
}

export type StoredSampleSheet = {
  sheetName: string;
  headerRowNumber: number;
  headers: string[];
};

export type StoredSampleHeaders = {
  headers: string[];
  sheetName: string | null;
  headerRowNumber: number | null;
  sheets: StoredSampleSheet[];
};

export function serializeSampleHeaders(
  selected: ExcelHeaderScanResult,
  sheets: ExcelHeaderScanResult[] = [selected],
): string {
  return JSON.stringify({
    headers: selected.headers,
    sheetName: selected.sheetName,
    headerRowNumber: selected.headerRowNumber,
    sheets: sheets.map((sheet) => ({
      sheetName: sheet.sheetName,
      headerRowNumber: sheet.headerRowNumber,
      headers: sheet.headers,
    })),
  } satisfies StoredSampleHeaders);
}

function parseSheetEntry(value: unknown): StoredSampleSheet | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const record = value as Record<string, unknown>;
  const sheetName =
    typeof record.sheetName === "string" ? record.sheetName.trim() : "";
  if (!sheetName) {
    return null;
  }
  const headersRaw = Array.isArray(record.headers) ? record.headers : [];
  return {
    sheetName,
    headerRowNumber:
      typeof record.headerRowNumber === "number" &&
      Number.isFinite(record.headerRowNumber)
        ? record.headerRowNumber
        : 1,
    headers: uniqueHeaders(
      headersRaw.map((item) => String(item ?? "").trim()).filter(Boolean),
    ),
  };
}

export function parseStoredSampleHeaders(
  raw: string | null | undefined,
): StoredSampleHeaders {
  if (!raw?.trim()) {
    return {
      headers: [],
      sheetName: null,
      headerRowNumber: null,
      sheets: [],
    };
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return {
        headers: uniqueHeaders(
          parsed.map((item) => String(item ?? "").trim()).filter(Boolean),
        ),
        sheetName: null,
        headerRowNumber: null,
        sheets: [],
      };
    }
    if (parsed && typeof parsed === "object") {
      const record = parsed as Record<string, unknown>;
      const headersRaw = Array.isArray(record.headers) ? record.headers : [];
      const headers = uniqueHeaders(
        headersRaw.map((item) => String(item ?? "").trim()).filter(Boolean),
      );
      const sheetName =
        typeof record.sheetName === "string" && record.sheetName.trim()
          ? record.sheetName.trim()
          : null;
      const headerRowNumber =
        typeof record.headerRowNumber === "number" &&
        Number.isFinite(record.headerRowNumber)
          ? record.headerRowNumber
          : null;
      const sheets = Array.isArray(record.sheets)
        ? record.sheets
            .map(parseSheetEntry)
            .filter((sheet): sheet is StoredSampleSheet => sheet !== null)
        : [];

      if (
        sheets.length === 0 &&
        sheetName &&
        (headers.length > 0 || headerRowNumber !== null)
      ) {
        sheets.push({
          sheetName,
          headerRowNumber: headerRowNumber ?? 1,
          headers,
        });
      }

      return {
        headers,
        sheetName,
        headerRowNumber,
        sheets,
      };
    }
  } catch {
    /* ignore */
  }
  return {
    headers: [],
    sheetName: null,
    headerRowNumber: null,
    sheets: [],
  };
}

export function selectStoredSheet(
  stored: StoredSampleHeaders,
  sheetName: string,
): StoredSampleHeaders | null {
  const target = sheetName.trim();
  const match = stored.sheets.find((sheet) => sheet.sheetName === target);
  if (!match) {
    return null;
  }
  return {
    headers: match.headers,
    sheetName: match.sheetName,
    headerRowNumber: match.headerRowNumber,
    sheets: stored.sheets,
  };
}

/** 1-based column index for a mapped header label (same rules as report parse). */
export function findColumnIndex(
  headerRow: ExcelJS.Row,
  targetHeader: string | null | undefined,
): number {
  if (!targetHeader?.trim()) {
    return 0;
  }
  const target = normalizeHeaderKey(targetHeader);
  let exact = 0;
  let prefix = 0;
  headerRow.eachCell({ includeEmpty: false }, (cell, columnNumber) => {
    const header = normalizeHeaderKey(cellText(cell.value));
    if (!header) {
      return;
    }
    if (header === target) {
      exact = columnNumber;
      return;
    }
    if (
      !prefix &&
      (header.startsWith(`${target}_`) || target.startsWith(`${header}_`))
    ) {
      prefix = columnNumber;
    }
  });
  return exact || prefix;
}

export const DISTINCT_COLUMN_VALUES_LIMIT = 200;

export type DistinctColumnValuesParams = {
  sheetName: string;
  headerRowNumber: number;
  columnHeader: string;
};

/** Distinct non-empty cell values for one column in the sample sheet. */
export async function extractDistinctColumnValues(
  buffer: ArrayBuffer | Buffer | Uint8Array,
  params: DistinctColumnValuesParams,
): Promise<string[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);

  const sheetName = params.sheetName.trim();
  const worksheet =
    workbook.getWorksheet(sheetName) ??
    workbook.worksheets.find(
      (sheet) => sheet.name.trim().toLowerCase() === sheetName.toLowerCase(),
    );
  if (!worksheet) {
    return [];
  }

  const headerRowNumber = OPCO_REPORT_HEADER_ROW;
  const columnIndex = findColumnIndex(
    worksheet.getRow(headerRowNumber),
    params.columnHeader,
  );

  if (columnIndex <= 0) {
    return [];
  }

  const seen = new Set<string>();
  const values: string[] = [];
  const lastRow = Math.max(
    worksheet.actualRowCount || 0,
    worksheet.rowCount || 0,
    headerRowNumber,
  );

  for (
    let rowNumber = headerRowNumber + 1;
    rowNumber <= lastRow && values.length < DISTINCT_COLUMN_VALUES_LIMIT;
    rowNumber += 1
  ) {
    const text = cellText(worksheet.getRow(rowNumber).getCell(columnIndex).value);
    if (!text || seen.has(text)) {
      continue;
    }
    seen.add(text);
    values.push(text);
  }

  values.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  return values;
}

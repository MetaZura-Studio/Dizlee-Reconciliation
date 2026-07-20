import ExcelJS from "exceljs";

const MAX_PREVIEW_ROWS = 250;
const MAX_PREVIEW_COLS = 60;

function cellToDisplay(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === "object") {
    if ("text" in value && typeof value.text === "string") {
      return value.text;
    }
    if ("result" in value && value.result !== undefined && value.result !== null) {
      return String(value.result);
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

/** Read the first worksheet as raw display cells (no report-schema mapping). */
export async function readRawExcelSheetPreview(
  source: ArrayBuffer | Buffer | Uint8Array,
): Promise<RawExcelSheetPreview> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(source as unknown as ExcelJS.Buffer);
  const sheet = workbook.worksheets[0];

  if (!sheet) {
    throw new Error("Workbook has no sheets");
  }

  const sheetRowCount = sheet.actualRowCount || sheet.rowCount || 0;
  const truncated = sheetRowCount > MAX_PREVIEW_ROWS;
  const limit = Math.min(sheetRowCount, MAX_PREVIEW_ROWS);
  const dataRows: string[][] = [];

  for (let rowNumber = 1; rowNumber <= limit; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    const cells: string[] = [];
    const colCount = Math.min(
      Math.max(row.cellCount || 0, sheet.actualColumnCount || sheet.columnCount || 0),
      MAX_PREVIEW_COLS,
    );
    for (let col = 1; col <= colCount; col += 1) {
      cells.push(cellToDisplay(row.getCell(col).value));
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

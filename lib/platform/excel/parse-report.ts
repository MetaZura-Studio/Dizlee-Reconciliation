/**
 * Partner/OpCo report Excel parser — maps header aliases to reconciliation line fields.
 * Throws ReportParseError on structural issues; skips blank rows.
 */
import ExcelJS from "exceljs";
import { DomainError } from "@/lib/errors/app-error";

export type ParsedReportLine = {
  lineNumber: number;
  description: string | null;
  usageAmount: number | null;
  usageUsd: number | null;
  amount: number | null;
  revenueSharePercent: number | null;
  exchangeRate: number | null;
  usageUnit: string | null;
  reconciliationBasis: string | null;
  sourceColumns: Record<string, string | number | null>;
};

export class ReportParseError extends DomainError {
  constructor(keyOrMessage: string) {
    super("ReportParseError", keyOrMessage);
  }
}

const COLUMN_ALIASES: Record<
  string,
  keyof Omit<ParsedReportLine, "lineNumber" | "sourceColumns">
> = {
  description: "description",
  service_description: "description",
  service_name: "description",
  usage_amount: "usageAmount",
  usageamount: "usageAmount",
  // OpCo "Original Amount" is the billable total compared to Partner gross — not usage volume.
  originalamount: "amount",
  original_amount: "amount",
  usage_usd: "usageUsd",
  usageusd: "usageUsd",
  zain_amount: "usageUsd",
  amount: "amount",
  gross_amount: "amount",
  revenue_share_percent: "revenueSharePercent",
  revenue_share: "revenueSharePercent",
  share_percent: "revenueSharePercent",
  gross_amount_lc: "amount",
  exchange_rate: "exchangeRate",
  exchangerate: "exchangeRate",
  usage_unit: "usageUnit",
  usageunit: "usageUnit",
  unit: "usageUnit",
  reconciliation_basis: "reconciliationBasis",
  reconciliationbasis: "reconciliationBasis",
  basis: "reconciliationBasis",
  category: "reconciliationBasis",
};

function normalizeHeader(value: ExcelJS.CellValue): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[()]/g, "")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

function parseDecimal(value: ExcelJS.CellValue): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  const parsed = Number.parseFloat(String(value).replace(/,/g, "").trim());

  if (Number.isNaN(parsed)) {
    return null;
  }

  return parsed;
}

function parseText(value: ExcelJS.CellValue): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const text = String(value).trim();
  return text.length > 0 ? text : null;
}

function rowHasValues(values: ExcelJS.CellValue[]): boolean {
  return values.some((value) => {
    if (value === null || value === undefined) {
      return false;
    }

    return String(value).trim().length > 0;
  });
}

function enrichSourceColumns(
  sourceColumns: Record<string, string | number | null>,
): void {
  const serviceCode =
    sourceColumns.service_code ??
    sourceColumns.servicecode ??
    sourceColumns.serviceid ??
    sourceColumns.sc;

  if (serviceCode !== null && serviceCode !== undefined && serviceCode !== "") {
    sourceColumns.service_code = serviceCode;
  }
}

export async function parseReportWorkbook(
  input: ArrayBuffer | Buffer,
): Promise<ParsedReportLine[]> {
  const workbook = new ExcelJS.Workbook();
  const workbookBuffer = Buffer.isBuffer(input) ? input : Buffer.from(input);
  await workbook.xlsx.load(workbookBuffer as unknown as ExcelJS.Buffer);

  const worksheet = workbook.worksheets[0];

  if (!worksheet) {
    throw new ReportParseError("Workbook does not contain any worksheets");
  }

  const headerRow = worksheet.getRow(1);
  const columnMap = new Map<
    number,
    keyof Omit<ParsedReportLine, "lineNumber" | "sourceColumns">
  >();

  headerRow.eachCell({ includeEmpty: false }, (cell, columnNumber) => {
    const alias = normalizeHeader(cell.value);
    const field = COLUMN_ALIASES[alias];

    if (field) {
      columnMap.set(columnNumber, field);
    }
  });

  if (columnMap.size === 0) {
    throw new ReportParseError(
      "No recognized columns found. Expected headers such as description, usage_amount, usage_usd, service name, or gross amount.",
    );
  }

  const lines: ParsedReportLine[] = [];

  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) {
      return;
    }

    const rawValues = Array.from({ length: headerRow.cellCount }, (_, index) =>
      row.getCell(index + 1).value,
    );

    if (!rowHasValues(rawValues)) {
      return;
    }

    const sourceColumns: Record<string, string | number | null> = {};
    const parsedLine: ParsedReportLine = {
      lineNumber: lines.length + 1,
      description: null,
      usageAmount: null,
      usageUsd: null,
      amount: null,
      revenueSharePercent: null,
      exchangeRate: null,
      usageUnit: null,
      reconciliationBasis: null,
      sourceColumns,
    };

    headerRow.eachCell({ includeEmpty: false }, (headerCell, columnNumber) => {
      const header = normalizeHeader(headerCell.value);
      const field = columnMap.get(columnNumber);
      const cellValue = row.getCell(columnNumber).value;

      sourceColumns[header] =
        cellValue === null || cellValue === undefined
          ? null
          : typeof cellValue === "number"
            ? cellValue
            : String(cellValue);

      if (!field) {
        return;
      }

      if (
        field === "description" ||
        field === "usageUnit" ||
        field === "reconciliationBasis"
      ) {
        parsedLine[field] = parseText(cellValue);
        return;
      }

      parsedLine[field] = parseDecimal(cellValue);
    });

    enrichSourceColumns(sourceColumns);

    // Prefer Original Amount over a plain Amount column when both are present.
    const originalAmount =
      parseDecimal(sourceColumns.originalamount) ??
      parseDecimal(sourceColumns.original_amount);
    if (originalAmount !== null) {
      parsedLine.amount = originalAmount;
    }

    if (
      parsedLine.description ||
      parsedLine.usageAmount !== null ||
      parsedLine.usageUsd !== null ||
      parsedLine.amount !== null
    ) {
      lines.push(parsedLine);
    }
  });

  if (lines.length === 0) {
    throw new ReportParseError("Excel file does not contain any report line items");
  }

  return lines;
}

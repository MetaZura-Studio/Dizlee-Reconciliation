/**
 * Parse OpCo report Excel using Admin-configured column mapping.
 */
import ExcelJS from "exceljs";

import {
  findWorksheetMatchingHeaders,
  normalizeHeaderKey,
} from "@/lib/admin/opco-report-mapping-excel";
import type { OpcoPartnerMode } from "@/lib/admin/opco-report-mappings.shared";
import { ReportParseError } from "@/lib/platform/excel/parse-report";
import {
  aggregateLinesByDescription,
  normalizeServiceKey,
  type PartnerColumnLine,
  type ResolvedServicePartnerLine,
} from "@/lib/platform/service-partner-map";

export type OpcoMappingParseConfig = {
  serviceColumn: string;
  partnerMode: OpcoPartnerMode;
  partnerColumn: string | null;
  revenueColumn: string;
  revenueShareColumn: string | null;
  rowFilterColumn?: string | null;
  rowFilterValue?: string | null;
  aggregateDailyRows: boolean;
  preferredSheetName?: string | null;
};

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

function parseDecimal(value: ExcelJS.CellValue): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  const parsed = Number.parseFloat(
    cellText(value).replace(/,/g, "").replace(/\$/g, "").replace(/%/g, "").trim(),
  );
  return Number.isNaN(parsed) ? null : parsed;
}

function rowHasValues(values: ExcelJS.CellValue[]): boolean {
  return values.some((value) => cellText(value).length > 0);
}

function findColumn(
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

export function assertOpcoMappingReady(config: {
  serviceColumn: string | null;
  partnerMode: string;
  partnerColumn: string | null;
  revenueColumn: string | null;
  revenueShareColumn?: string | null;
  rowFilterColumn?: string | null;
  rowFilterValue?: string | null;
  aggregateDailyRows?: boolean;
  preferredSheetName?: string | null;
}): OpcoMappingParseConfig {
  if (!config.serviceColumn?.trim() || !config.revenueColumn?.trim()) {
    throw new ReportParseError(
      "OpCo report column mapping is incomplete. Ask an admin to map Service and Revenue columns.",
    );
  }
  const partnerMode = config.partnerMode as OpcoPartnerMode;
  if (
    partnerMode !== "EXCEL_COLUMN" &&
    partnerMode !== "SERVICE_PARTNER_MAP" &&
    partnerMode !== "UPLOAD_PICKER"
  ) {
    throw new ReportParseError("OpCo report Partner mode is invalid.");
  }
  if (partnerMode === "EXCEL_COLUMN" && !config.partnerColumn?.trim()) {
    throw new ReportParseError(
      "OpCo report mapping requires a Partner Excel column for this OpCo.",
    );
  }
  return {
    serviceColumn: config.serviceColumn.trim(),
    partnerMode,
    partnerColumn: config.partnerColumn?.trim() || null,
    revenueColumn: config.revenueColumn.trim(),
    revenueShareColumn: config.revenueShareColumn?.trim() || null,
    rowFilterColumn: config.rowFilterColumn?.trim() || null,
    rowFilterValue: config.rowFilterValue?.trim() || null,
    aggregateDailyRows: Boolean(config.aggregateDailyRows),
    preferredSheetName: config.preferredSheetName?.trim() || null,
  };
}

export async function parseOpcoReportWithMapping(
  input: ArrayBuffer | Buffer,
  config: OpcoMappingParseConfig,
): Promise<{
  partnerMode: OpcoPartnerMode;
  partnerColumnLines: PartnerColumnLine[];
  serviceMapLines: ResolvedServicePartnerLine[];
  pickerLines: ResolvedServicePartnerLine[];
}> {
  const workbook = new ExcelJS.Workbook();
  const workbookBuffer = Buffer.isBuffer(input) ? input : Buffer.from(input);
  await workbook.xlsx.load(workbookBuffer as unknown as ExcelJS.Buffer);

  const matched = findWorksheetMatchingHeaders(
    workbook,
    [
      config.serviceColumn,
      config.revenueColumn,
      config.partnerMode === "EXCEL_COLUMN" ? config.partnerColumn : null,
    ],
    config.preferredSheetName,
  );
  if (!matched) {
    throw new ReportParseError("Workbook does not contain any worksheets");
  }

  const { worksheet, headerRowNumber } = matched;
  const headerRow = worksheet.getRow(headerRowNumber);
  const serviceCol = findColumn(headerRow, config.serviceColumn);
  const revenueCol = findColumn(headerRow, config.revenueColumn);
  const partnerCol =
    config.partnerMode === "EXCEL_COLUMN"
      ? findColumn(headerRow, config.partnerColumn)
      : 0;
  const shareCol = findColumn(headerRow, config.revenueShareColumn);
  const filterCol = findColumn(headerRow, config.rowFilterColumn);
  const filterValue = config.rowFilterValue?.trim().toLowerCase() ?? "";

  if (!serviceCol || !revenueCol) {
    throw new ReportParseError(
      `Missing mapped columns. Expected Service "${config.serviceColumn}" and Revenue "${config.revenueColumn}".`,
    );
  }
  if (config.rowFilterColumn?.trim() && !filterCol) {
    throw new ReportParseError(
      `Missing row filter column "${config.rowFilterColumn}" in the Excel file.`,
    );
  }
  if (config.partnerMode === "EXCEL_COLUMN" && !partnerCol) {
    throw new ReportParseError(
      `Missing Partner column "${config.partnerColumn}" in the Excel file.`,
    );
  }

  const partnerColumnLines: PartnerColumnLine[] = [];
  const serviceMapLines: ResolvedServicePartnerLine[] = [];
  const pickerLines: ResolvedServicePartnerLine[] = [];

  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber <= headerRowNumber) {
      return;
    }
    const rawValues = Array.from({ length: headerRow.cellCount }, (_, index) =>
      row.getCell(index + 1).value,
    );
    if (!rowHasValues(rawValues)) {
      return;
    }

    if (filterCol > 0 && filterValue) {
      const cell = cellText(row.getCell(filterCol).value).toLowerCase();
      if (cell !== filterValue) {
        return;
      }
    }

    const serviceName = cellText(row.getCell(serviceCol).value);
    if (!serviceName) {
      return;
    }
    const amount = parseDecimal(row.getCell(revenueCol).value);
    const share =
      shareCol > 0 ? parseDecimal(row.getCell(shareCol).value) : null;

    const sourceColumns: Record<string, string | number | null> = {
      service: serviceName,
      amount,
    };
    if (share !== null) {
      sourceColumns.revenue_share_percent = share;
    }

    headerRow.eachCell({ includeEmpty: false }, (headerCell, columnNumber) => {
      const header =
        normalizeHeaderKey(cellText(headerCell.value)) || `col_${columnNumber}`;
      const cellValue = row.getCell(columnNumber).value;
      sourceColumns[header] =
        cellValue === null || cellValue === undefined
          ? null
          : typeof cellValue === "number"
            ? cellValue
            : cellText(cellValue);
    });

    const base: ResolvedServicePartnerLine = {
      serviceKey: normalizeServiceKey(serviceName),
      serviceName,
      description: serviceName,
      amount,
      revenueSharePercent: share,
      lineNumber: 0,
      sourceColumns,
    };

    if (config.partnerMode === "EXCEL_COLUMN") {
      const partnerName = cellText(row.getCell(partnerCol).value);
      if (!partnerName) {
        return;
      }
      partnerColumnLines.push({
        ...base,
        partnerName,
        partnerKey: normalizeServiceKey(partnerName),
        lineNumber: partnerColumnLines.length + 1,
      });
      return;
    }

    if (config.partnerMode === "SERVICE_PARTNER_MAP") {
      serviceMapLines.push({
        ...base,
        lineNumber: serviceMapLines.length + 1,
      });
      return;
    }

    pickerLines.push({
      ...base,
      lineNumber: pickerLines.length + 1,
    });
  });

  if (
    partnerColumnLines.length === 0 &&
    serviceMapLines.length === 0 &&
    pickerLines.length === 0
  ) {
    throw new ReportParseError("Excel file does not contain any report line items");
  }

  const aggregatedPartnerLines = config.aggregateDailyRows
    ? aggregateLinesByDescription(partnerColumnLines)
    : partnerColumnLines;
  const aggregatedServiceLines = config.aggregateDailyRows
    ? aggregateLinesByDescription(serviceMapLines)
    : serviceMapLines;
  const aggregatedPickerLines = config.aggregateDailyRows
    ? aggregateLinesByDescription(pickerLines)
    : pickerLines;

  return {
    partnerMode: config.partnerMode,
    partnerColumnLines: aggregatedPartnerLines,
    serviceMapLines: aggregatedServiceLines,
    pickerLines: aggregatedPickerLines,
  };
}

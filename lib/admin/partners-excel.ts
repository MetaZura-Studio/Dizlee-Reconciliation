/**
 * Excel parse/generate for Admin Partners bulk import.
 */
import ExcelJS from "exceljs";

import type { AdminEntityStatus } from "@/lib/admin/partners.shared";
import { compactPartnerKey } from "@/lib/platform/service-partner-map";

export type ParsedPartnerRow = {
  name: string;
  status: AdminEntityStatus;
  rowNumber: number;
};

export type PartnerParseIssue = {
  rowNumber: number;
  message: string;
};

export type PartnerParseResult = {
  rows: ParsedPartnerRow[];
  issues: PartnerParseIssue[];
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

function normalizeHeader(value: ExcelJS.CellValue): string {
  return cellText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function isNameHeader(header: string): boolean {
  return header === "name" || header === "partner" || header === "partnername";
}

function isStatusHeader(header: string): boolean {
  return header === "status";
}

function parseStatus(raw: string): AdminEntityStatus | null {
  if (!raw) {
    return "ACTIVE";
  }
  const normalized = raw.trim().toUpperCase().replace(/\s+/g, "_");
  if (normalized === "ACTIVE" || normalized === "INACTIVE") {
    return normalized;
  }
  return null;
}

export async function parsePartnersExcel(
  buffer: ArrayBuffer | Buffer | Uint8Array,
): Promise<PartnerParseResult> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) {
    return {
      rows: [],
      issues: [{ rowNumber: 0, message: "Workbook has no sheets" }],
    };
  }

  const headerRow = sheet.getRow(1);
  let nameCol = 0;
  let statusCol = 0;

  headerRow.eachCell((cell, colNumber) => {
    const header = normalizeHeader(cell.value);
    if (isNameHeader(header)) {
      nameCol = colNumber;
    }
    if (isStatusHeader(header)) {
      statusCol = colNumber;
    }
  });

  if (!nameCol) {
    return {
      rows: [],
      issues: [
        {
          rowNumber: 1,
          message: "Missing required header. Expected Name (optional Status).",
        },
      ],
    };
  }

  const rows: ParsedPartnerRow[] = [];
  const issues: PartnerParseIssue[] = [];
  const seenKeys = new Set<string>();

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      return;
    }

    const name = cellText(row.getCell(nameCol).value);
    const statusRaw = statusCol
      ? cellText(row.getCell(statusCol).value)
      : "";

    if (!name && !statusRaw) {
      return;
    }

    if (!name) {
      issues.push({
        rowNumber,
        message: "Partner name is required",
      });
      return;
    }

    if (name.length > 255) {
      issues.push({
        rowNumber,
        message: `Partner name exceeds 255 characters ("${name.slice(0, 40)}…")`,
      });
      return;
    }

    const status = parseStatus(statusRaw);
    if (!status) {
      issues.push({
        rowNumber,
        message: `Invalid Status "${statusRaw}". Use ACTIVE or INACTIVE.`,
      });
      return;
    }

    const key = compactPartnerKey(name);
    if (!key) {
      issues.push({
        rowNumber,
        message: `Partner name has no letters or digits ("${name}")`,
      });
      return;
    }

    if (seenKeys.has(key)) {
      issues.push({
        rowNumber,
        message: `Duplicate partner name in sheet ("${name}")`,
      });
      return;
    }
    seenKeys.add(key);

    rows.push({ name, status, rowNumber });
  });

  return { rows, issues };
}

export async function buildPartnersTemplateBuffer(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Partners");
  sheet.addRow(["Name", "Status"]);
  sheet.getRow(1).font = { bold: true };
  sheet.getColumn(1).width = 32;
  sheet.getColumn(2).width = 12;
  sheet.addRow(["Example Partner", "ACTIVE"]);

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

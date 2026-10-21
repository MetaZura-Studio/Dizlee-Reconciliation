/**
 * Excel parse/generate for Admin OpCo per-service regulatory fee import.
 */
import ExcelJS from "exceljs";

export type ParsedOpcoRegulatoryFeeRow = {
  serviceName: string;
  regulatoryFeePercent: number;
  rowNumber: number;
};

export type OpcoRegulatoryFeeParseIssue = {
  rowNumber: number;
  message: string;
};

export type OpcoRegulatoryFeeParseResult = {
  rows: ParsedOpcoRegulatoryFeeRow[];
  issues: OpcoRegulatoryFeeParseIssue[];
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

function isServiceHeader(header: string): boolean {
  return (
    header === "serviceorapplicationname" ||
    header === "servicename" ||
    header === "service" ||
    header === "applicationname" ||
    header === "application"
  );
}

function isFeeHeader(header: string): boolean {
  return (
    header === "regulatoryfeepercent" ||
    header === "regulatoryfee" ||
    header === "feepercent" ||
    header === "vatpercent" ||
    header === "vat"
  );
}

function parseFeePercent(raw: string): number | null {
  const cleaned = raw.replace(/%/g, "").trim();
  if (!cleaned || !/^\d+(\.\d{1,2})?$/.test(cleaned)) {
    return null;
  }
  const value = Number.parseFloat(cleaned);
  if (!Number.isFinite(value) || value < 0 || value > 100) {
    return null;
  }
  return value;
}

export async function parseOpcoRegulatoryFeesExcel(
  buffer: ArrayBuffer | Buffer | Uint8Array,
): Promise<OpcoRegulatoryFeeParseResult> {
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
  let serviceCol = 0;
  let feeCol = 0;

  headerRow.eachCell((cell, colNumber) => {
    const header = normalizeHeader(cell.value);
    if (isServiceHeader(header)) {
      serviceCol = colNumber;
    }
    if (isFeeHeader(header)) {
      feeCol = colNumber;
    }
  });

  if (!serviceCol || !feeCol) {
    return {
      rows: [],
      issues: [
        {
          rowNumber: 1,
          message:
            "Missing required headers. Expected Service Name and Regulatory Fee %.",
        },
      ],
    };
  }

  const rows: ParsedOpcoRegulatoryFeeRow[] = [];
  const issues: OpcoRegulatoryFeeParseIssue[] = [];

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      return;
    }

    const serviceName = cellText(row.getCell(serviceCol).value);
    const feeRaw = cellText(row.getCell(feeCol).value);

    if (!serviceName && !feeRaw) {
      return;
    }

    if (!serviceName) {
      issues.push({
        rowNumber,
        message: "Service/Application name is required",
      });
      return;
    }

    const fee = parseFeePercent(feeRaw);
    if (fee === null) {
      issues.push({
        rowNumber,
        message: `Regulatory fee % must be a number from 0 to 100 (up to 2 decimals) for "${serviceName}"`,
      });
      return;
    }

    rows.push({ serviceName, regulatoryFeePercent: fee, rowNumber });
  });

  return { rows, issues };
}

export async function buildOpcoRegulatoryFeesTemplateBuffer(params: {
  opcoName: string;
  rows: Array<{ serviceName: string; regulatoryFeePercent: number }>;
}): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("RegulatoryFees");
  sheet.addRow(["Service Name", "Regulatory Fee %"]);
  sheet.getRow(1).font = { bold: true };
  sheet.getColumn(1).width = 36;
  sheet.getColumn(2).width = 20;

  if (params.rows.length === 0) {
    sheet.addRow(["Example Service Name", 0]);
  } else {
    for (const row of params.rows) {
      sheet.addRow([row.serviceName, row.regulatoryFeePercent]);
    }
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

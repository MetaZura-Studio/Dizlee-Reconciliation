/**
 * Excel parse/generate for Admin Service–Partner map import.
 */
import ExcelJS from "exceljs";

export type ParsedServicePartnerMapRow = {
  opcoName: string;
  serviceName: string;
  partnerName: string;
  rowNumber: number;
};

export type ServicePartnerMapParseIssue = {
  rowNumber: number;
  message: string;
};

export type ServicePartnerMapParseResult = {
  rows: ParsedServicePartnerMapRow[];
  issues: ServicePartnerMapParseIssue[];
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

function isOpcoHeader(header: string): boolean {
  return header === "opco" || header === "opconame";
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

function isPartnerHeader(header: string): boolean {
  return header === "partner" || header === "partnername";
}

export async function parseServicePartnerMapsExcel(
  buffer: ArrayBuffer | Buffer | Uint8Array,
): Promise<ServicePartnerMapParseResult> {
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
  let opcoCol = 0;
  let serviceCol = 0;
  let partnerCol = 0;

  headerRow.eachCell((cell, colNumber) => {
    const header = normalizeHeader(cell.value);
    if (isOpcoHeader(header)) {
      opcoCol = colNumber;
    }
    if (isServiceHeader(header)) {
      serviceCol = colNumber;
    }
    if (isPartnerHeader(header)) {
      partnerCol = colNumber;
    }
  });

  if (!opcoCol || !serviceCol || !partnerCol) {
    return {
      rows: [],
      issues: [
        {
          rowNumber: 1,
          message: "Missing required headers. Expected OpCo, Partner, and Service.",
        },
      ],
    };
  }

  const rows: ParsedServicePartnerMapRow[] = [];
  const issues: ServicePartnerMapParseIssue[] = [];

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      return;
    }

    const opcoName = cellText(row.getCell(opcoCol).value);
    const serviceName = cellText(row.getCell(serviceCol).value);
    const partnerName = cellText(row.getCell(partnerCol).value);

    if (!opcoName && !serviceName && !partnerName) {
      return;
    }

    if (!opcoName) {
      issues.push({
        rowNumber,
        message: `Missing OpCo for "${serviceName || partnerName}"`,
      });
      return;
    }

    if (!serviceName) {
      issues.push({
        rowNumber,
        message: "Service/Application name is required",
      });
      return;
    }

    if (!partnerName) {
      issues.push({
        rowNumber,
        message: `Missing Partner for "${serviceName}"`,
      });
      return;
    }

    rows.push({ opcoName, serviceName, partnerName, rowNumber });
  });

  return { rows, issues };
}

export async function buildServicePartnerMapsTemplateBuffer(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("ServicePartnerMaps");
  sheet.addRow(["OpCo", "Partner", "Service"]);
  sheet.getRow(1).font = { bold: true };
  sheet.getColumn(1).width = 22;
  sheet.getColumn(2).width = 28;
  sheet.getColumn(3).width = 36;
  sheet.addRow(["Zain KSA", "Google", "Example Service Name"]);

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

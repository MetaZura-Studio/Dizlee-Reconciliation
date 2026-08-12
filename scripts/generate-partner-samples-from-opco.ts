/**
 * Read marked OpCo Apr26 workbooks and write Partner sample Excels for reconcile tests.
 */
import ExcelJS from "exceljs";
import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";

const OPCO_DIR = path.join(process.cwd(), "Reports", "Opco Reports- Marked");
const OUT_DIR = path.join(process.cwd(), "Reports", "Partner Reports- Samples");

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
  if (typeof value === "object" && "richText" in value && Array.isArray(value.richText)) {
    return value.richText.map((part) => part.text ?? "").join("").trim();
  }
  return String(value).trim();
}

function normalizeHeader(value: string): string {
  return value
    .toLowerCase()
    .replace(/\r?\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseAmount(value: ExcelJS.CellValue): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  const text = cellText(value).replace(/,/g, "").replace(/—|–|-/g, "").trim();
  if (!text) {
    return null;
  }
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
}

function headerMatches(cell: string, wanted: string): boolean {
  const left = normalizeHeader(cell);
  const right = normalizeHeader(wanted);
  return left === right || left.startsWith(right);
}

type Line = { service: string; amount: number };

function findHeader(
  sheet: ExcelJS.Worksheet,
  partnerHeader: string,
  serviceHeader: string,
  amountHeader: string,
): { rowNumber: number; partnerCol: number; serviceCol: number; amountCol: number } | null {
  for (let rowNumber = 1; rowNumber <= Math.min(sheet.rowCount || 0, 20); rowNumber += 1) {
    let partnerCol = 0;
    let serviceCol = 0;
    let amountCol = 0;
    sheet.getRow(rowNumber).eachCell({ includeEmpty: false }, (cell, columnNumber) => {
      const label = cellText(cell.value);
      if (headerMatches(label, partnerHeader)) {
        partnerCol = columnNumber;
      }
      if (headerMatches(label, serviceHeader)) {
        serviceCol = columnNumber;
      }
      if (headerMatches(label, amountHeader)) {
        amountCol = columnNumber;
      }
    });
    if (partnerCol && serviceCol && amountCol) {
      return { rowNumber, partnerCol, serviceCol, amountCol };
    }
  }
  return null;
}

function worksheetByName(workbook: ExcelJS.Workbook, preferred?: string): ExcelJS.Worksheet {
  if (preferred) {
    const wanted = preferred.trim().toLowerCase();
    const match = workbook.worksheets.find(
      (sheet) => sheet.name.trim().toLowerCase() === wanted,
    );
    if (match) {
      return match;
    }
  }
  const first = workbook.worksheets[0];
  if (!first) {
    throw new Error("Workbook has no sheets");
  }
  return first;
}

async function extract(params: {
  file: string;
  sheetName?: string;
  partnerHeader: string;
  serviceHeader: string;
  amountHeader: string;
  partnerEquals: string[];
}): Promise<Line[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(path.join(OPCO_DIR, params.file));
  const sheet = worksheetByName(workbook, params.sheetName);
  const header = findHeader(
    sheet,
    params.partnerHeader,
    params.serviceHeader,
    params.amountHeader,
  );
  if (!header) {
    throw new Error(`Headers not found in ${params.file} / ${sheet.name}`);
  }

  const partnerKeys = new Set(params.partnerEquals.map((name) => normalizeHeader(name)));
  const lines: Line[] = [];
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber <= header.rowNumber) {
      return;
    }
    const partner = cellText(row.getCell(header.partnerCol).value);
    if (!partnerKeys.has(normalizeHeader(partner))) {
      return;
    }
    const service = cellText(row.getCell(header.serviceCol).value);
    const amount = parseAmount(row.getCell(header.amountCol).value);
    if (!service || amount === null) {
      return;
    }
    lines.push({ service, amount });
  });
  return lines;
}

function aggregateByService(lines: Line[]): Line[] {
  const map = new Map<string, Line>();
  for (const line of lines) {
    const key = normalizeHeader(line.service);
    const existing = map.get(key);
    if (existing) {
      existing.amount += line.amount;
    } else {
      map.set(key, { service: line.service, amount: line.amount });
    }
  }
  return [...map.values()].sort((a, b) => a.service.localeCompare(b.service));
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function writePartnerWorkbook(params: {
  opcoName: string;
  filename: string;
  lines: Line[];
}): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Report");
  sheet.addRow(["OpCo Name", "Service Name", "Gross Amount"]);
  for (const line of params.lines) {
    sheet.addRow([params.opcoName, line.service, Number(line.amount.toFixed(4))]);
  }
  sheet.getRow(1).font = { bold: true };
  sheet.columns = [{ width: 22 }, { width: 48 }, { width: 16 }];
  await writeFile(
    path.join(OUT_DIR, params.filename),
    Buffer.from(await workbook.xlsx.writeBuffer()),
  );
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const jobs = [
    {
      opcoName: "Zain Bahrain",
      loginPartner: "DigitalVirgo",
      file: "Zain Bahrain-Apr26.xlsx",
      sheetName: "Summary",
      partnerHeader: "Merchant Name",
      serviceHeader: "Service Name",
      amountHeader: "Total Gross Revenue",
      partnerEquals: ["DIGITAL VIRGO", "Digital Virgo", "DigitalVirgo"],
    },
    {
      opcoName: "Zain Jordan",
      loginPartner: "DigitalVirgo",
      file: "Zain Jordan-Apr26.xlsx",
      partnerHeader: "Merchant Name",
      serviceHeader: "Service Name",
      amountHeader: "Total Gross Revenue",
      partnerEquals: ["Digital Virgo", "DIGITAL VIRGO", "DigitalVirgo"],
    },
    {
      opcoName: "Zain Jordan",
      loginPartner: "ArpuPlus",
      file: "Zain Jordan-Apr26.xlsx",
      partnerHeader: "Merchant Name",
      serviceHeader: "Service Name",
      amountHeader: "Total Gross Revenue",
      partnerEquals: ["ArpuPlus", "Arpu Plus"],
    },
    {
      opcoName: "Zain Kuwait",
      loginPartner: "Docomo Digital",
      file: "Zain Kuwait-Apr26.xlsx",
      sheetName: "Dizlee Rev 3% - Detailed",
      partnerHeader: "Service provider Name",
      serviceHeader: "Service name",
      amountHeader: "Gross Revenue (LC)",
      partnerEquals: ["Docomo", "Docomo Digital", "DOCOMO"],
    },
  ];

  const notes: string[] = [
    "# Partner sample reports",
    "",
    "Built from `Reports/Opco Reports- Marked/*-Apr26.xlsx` so service names and gross amounts match the OpCo file.",
    "Partner parser uses **Service Name** + **Gross Amount**. Pick the OpCo in the Partner upload UI.",
    "Period: **April 2026**.",
    "",
  ];

  for (const job of jobs) {
    const raw = await extract(job);
    const lines = aggregateByService(raw);
    if (lines.length === 0) {
      throw new Error(`No rows for ${job.loginPartner} in ${job.file}`);
    }
    const filename = `partner-${slugify(job.loginPartner)}-${slugify(job.opcoName)}-apr26.xlsx`;
    await writePartnerWorkbook({
      opcoName: job.opcoName,
      filename,
      lines,
    });
    const total = lines.reduce((sum, line) => sum + line.amount, 0);
    notes.push(
      `- \`${filename}\` — login **${job.loginPartner}**, OpCo **${job.opcoName}**, April 2026. ${lines.length} services (aggregated), total gross ${total.toFixed(2)}. Source: \`${job.file}\`.`,
    );
    console.log(`wrote ${filename} services=${lines.length} rawRows=${raw.length}`);
  }

  await writeFile(path.join(OUT_DIR, "README.md"), `${notes.join("\n")}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

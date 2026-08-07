import ExcelJS from "exceljs";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  ReportParseError,
  parseReportWorkbook,
} from "@/lib/opco/excel/parse-report";

async function buildSampleWorkbookBuffer(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Report");

  worksheet.addRow([
    "description",
    "usage_amount",
    "usage_usd",
    "usage_unit",
    "reconciliation_basis",
  ]);
  worksheet.addRow(["Voice traffic", 1200, 950.5, "minutes", "gross"]);
  worksheet.addRow(["SMS traffic", 500, 210.25, "messages", "net"]);

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

describe("parse report workbook", () => {
  it("parses recognized report columns into line items", async () => {
    const buffer = await buildSampleWorkbookBuffer();
    const lines = await parseReportWorkbook(buffer);

    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatchObject({
      lineNumber: 1,
      description: "Voice traffic",
      usageAmount: 1200,
      usageUsd: 950.5,
      usageUnit: "minutes",
      reconciliationBasis: "gross",
    });
    expect(lines[1]?.description).toBe("SMS traffic");
  });

  it("throws when the workbook has no recognized columns", async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Report");
    worksheet.addRow(["foo", "bar"]);
    worksheet.addRow(["baz", "qux"]);
    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());

    await expect(parseReportWorkbook(buffer)).rejects.toBeInstanceOf(
      ReportParseError,
    );
  });

  it("parses partner sample report headers", async () => {
    const buffer = readFileSync("Reports/partner-report-sample-full-columns.xlsx");
    const lines = await parseReportWorkbook(buffer);

    expect(lines.length).toBeGreaterThan(0);
    expect(lines[0]).toMatchObject({
      description: "Games",
      amount: 50,
    });
    expect(lines[0]?.sourceColumns.service_code).toBe(100);
  });

  it("parses opco sample report headers", async () => {
    const buffer = readFileSync("Reports/opco-report-sample-1-full-columns.xlsx");
    const lines = await parseReportWorkbook(buffer);

    expect(lines.length).toBeGreaterThan(0);
    expect(lines[0]).toMatchObject({
      description: "UHD",
      usageUsd: 10,
      amount: 50,
    });
    // ORIGINALAMOUNT is the billable amount — not usage volume.
    expect(lines[0]?.usageAmount).toBeNull();
  });

  it("maps Original Amount header to amount even when Amount also exists", async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Report");
    worksheet.addRow(["Service name", "Amount", "Original Amount", "Zain amount"]);
    worksheet.addRow(["Games", 99, 50, 10]);
    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());

    const lines = await parseReportWorkbook(buffer);
    expect(lines[0]).toMatchObject({
      description: "Games",
      amount: 50,
      usageUsd: 10,
    });
  });
});

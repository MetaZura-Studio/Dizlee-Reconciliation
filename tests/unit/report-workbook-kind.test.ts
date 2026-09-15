/**
 * Unit tests for OpCo vs Partner Excel fingerprint and wrong-portal rejection.
 */

import ExcelJS from "exceljs";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { formatAppError } from "@/lib/errors/format";
import {
  WRONG_REPORT_FORMAT_MESSAGE,
  WRONG_REPORT_TYPE_FOR_OPCO,
  WRONG_REPORT_TYPE_FOR_PARTNER,
  WrongReportTypeError,
  assertOpcoPortalReportWorkbook,
  assertPartnerPortalReportWorkbook,
  detectReportWorkbookKind,
} from "@/lib/platform/excel/report-workbook-kind";

async function workbookFromHeaders(
  headers: string[],
  sheetName = "Report",
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);
  worksheet.addRow(headers);
  worksheet.addRow(headers.map(() => 1));
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

describe("detectReportWorkbookKind", () => {
  it("classifies Dizlee Performance / OpCo-style headers as opco", async () => {
    const buffer = await workbookFromHeaders(
      [
        "APPLICATIONNAME",
        "SERVICE_REVENUE/IQD",
        "Net after CMC",
        "SP share",
        "Bango share",
        "Dizlee share",
      ],
      "Dizlee Performance",
    );

    expect(await detectReportWorkbookKind(buffer)).toBe("opco");
  });

  it("classifies classic OpCo sample headers as opco", async () => {
    const buffer = await workbookFromHeaders([
      "VENDORNAME",
      "SERVICE NAME",
      "ORIGINALAMOUNT",
      "ZAIN amount",
    ]);

    expect(await detectReportWorkbookKind(buffer)).toBe("opco");
  });

  it("classifies Partner template headers as partner", async () => {
    const buffer = await workbookFromHeaders([
      "Merchant",
      "Service name",
      "Gross amount (USD)",
      "usage_amount",
    ]);

    expect(await detectReportWorkbookKind(buffer)).toBe("partner");
  });

  it("classifies Partner template with legacy Gross amount (LC) as partner", async () => {
    const buffer = await workbookFromHeaders([
      "Merchant",
      "Service name",
      "Gross amount (LC)",
      "usage_amount",
    ]);

    expect(await detectReportWorkbookKind(buffer)).toBe("partner");
  });

  it("classifies partner sample file as partner", async () => {
    const buffer = readFileSync("Reports/partner-report-sample-full-columns.xlsx");
    expect(await detectReportWorkbookKind(buffer)).toBe("partner");
  });

  it("classifies opco sample file as opco", async () => {
    const buffer = readFileSync("Reports/opco-report-sample-1-full-columns.xlsx");
    expect(await detectReportWorkbookKind(buffer)).toBe("opco");
  });
});

describe("assert portal workbook kind", () => {
  it("rejects OpCo-like files on Partner portal with a clear message", async () => {
    const buffer = await workbookFromHeaders([
      "APPLICATIONNAME",
      "SERVICE_REVENUE/IQD",
      "Dizlee share",
    ]);

    await expect(assertPartnerPortalReportWorkbook(buffer)).rejects.toMatchObject({
      name: "WrongReportTypeError",
      message: WRONG_REPORT_FORMAT_MESSAGE,
      status: 400,
    });
    await expect(assertPartnerPortalReportWorkbook(buffer)).rejects.toBeInstanceOf(
      WrongReportTypeError,
    );
  });

  it("rejects Partner-like files on OpCo portal with a clear message", async () => {
    const buffer = await workbookFromHeaders([
      "Merchant",
      "Service name",
      "Gross amount (USD)",
    ]);

    await expect(assertOpcoPortalReportWorkbook(buffer)).rejects.toMatchObject({
      name: "WrongReportTypeError",
      message: WRONG_REPORT_TYPE_FOR_OPCO,
      status: 400,
    });
  });

  it("allows Partner files on Partner portal", async () => {
    const buffer = readFileSync("Reports/partner-report-sample-full-columns.xlsx");
    await expect(assertPartnerPortalReportWorkbook(buffer)).resolves.toBeUndefined();
  });

  it("allows OpCo files on OpCo portal", async () => {
    const buffer = readFileSync("Reports/opco-report-sample-1-full-columns.xlsx");
    await expect(assertOpcoPortalReportWorkbook(buffer)).resolves.toBeUndefined();
  });

  it("surfaces wrong-type message over upload fallback in the UI formatter", () => {
    const error = new WrongReportTypeError(WRONG_REPORT_TYPE_FOR_PARTNER);
    expect(
      formatAppError({ error: error.toJSON() }, "Failed to upload report"),
    ).toBe(WRONG_REPORT_FORMAT_MESSAGE);
  });
});

import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";

import { readRawExcelSheetPreview } from "@/lib/platform/excel/read-raw-sheet";

describe("readRawExcelSheetPreview", () => {
  it("shows Excel percent cells as displayed percents (3% not 0.03)", async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Detailed");
    sheet.addRow(["Service", "Dizlee Share %", "Amount"]);
    const row = sheet.addRow(["Games", 0.03, 100]);
    row.getCell(2).numFmt = "0%";
    const row2 = sheet.addRow(["SMS", 0.01, 50]);
    row2.getCell(2).numFmt = "0%";
    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());

    const preview = await readRawExcelSheetPreview(buffer);
    expect(preview.rows[0]?.[1]).toBe("Dizlee Share %");
    expect(preview.rows[1]?.[1]).toBe("3%");
    expect(preview.rows[2]?.[1]).toBe("1%");
  });

  it("treats bare share-column numbers as display percents (WYSIWYG)", async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Sheet1");
    sheet.addRow(["Service", "RS %", "Amount"]);
    sheet.addRow(["Games", 0.03, 100]);
    sheet.addRow(["SMS", 0.5, 50]);
    sheet.addRow(["App", 3, 20]);
    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());

    const preview = await readRawExcelSheetPreview(buffer);
    expect(preview.rows[1]?.[1]).toBe("0.03%");
    expect(preview.rows[2]?.[1]).toBe("0.5%");
    expect(preview.rows[3]?.[1]).toBe("3%");
  });

  it("does not rescale RS export cells that already store whole percents", async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Revenue Share");
    sheet.addRow(["Partner", "Revenue Share %"]);
    const row = sheet.addRow(["ArpuPlus", 63]);
    // Same format as Dizlee RS Excel: value 63, literal % suffix (not Excel fraction).
    row.getCell(2).numFmt = '0.00"%"';
    const row2 = sheet.addRow(["Other", 1]);
    row2.getCell(2).numFmt = '0.00"%"';
    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());

    const preview = await readRawExcelSheetPreview(buffer);
    expect(preview.rows[1]?.[1]).toBe("63%");
    expect(preview.rows[2]?.[1]).toBe("1%");
  });

  it("formats money-like numbers with Excel numFmt and cleans float noise", async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Sheet1");
    sheet.addRow(["Service", "Gross", "Net", "Merchant Share - JOD"]);
    const row = sheet.addRow([
      "Games",
      1567.4,
      18.368999999999996,
      2881.0153999999998,
    ]);
    row.getCell(2).numFmt = "0.0";
    row.getCell(3).numFmt = "0.0";
    row.getCell(4).numFmt = "#,##0.00";
    sheet.addRow(["SMS", 64.05000000000001, 495.47400000000005, 12]);
    // No numFmt — still strip float noise
    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());

    const preview = await readRawExcelSheetPreview(buffer);
    expect(preview.rows[1]?.[1]).toBe("1567.4");
    expect(preview.rows[1]?.[2]).toBe("18.4");
    expect(preview.rows[1]?.[3]).toBe("2,881.02");
    expect(preview.rows[2]?.[1]).toBe("64.05");
    expect(preview.rows[2]?.[2]).toBe("495.474");
  });
});

import { describe, expect, it } from "vitest";

import {
  buildOpcoRegulatoryFeesTemplateBuffer,
  parseOpcoRegulatoryFeesExcel,
} from "@/lib/admin/opco-regulatory-fees-excel";

describe("opco regulatory fees excel", () => {
  it("round-trips service name and fee percent", async () => {
    const buffer = await buildOpcoRegulatoryFeesTemplateBuffer({
      opcoName: "Zain KSA",
      rows: [
        { serviceName: "Games", regulatoryFeePercent: 6 },
        { serviceName: "SMS", regulatoryFeePercent: 0 },
      ],
    });
    const parsed = await parseOpcoRegulatoryFeesExcel(buffer);
    expect(parsed.issues).toEqual([]);
    expect(parsed.rows).toEqual([
      { serviceName: "Games", regulatoryFeePercent: 6, rowNumber: 2 },
      { serviceName: "SMS", regulatoryFeePercent: 0, rowNumber: 3 },
    ]);
  });

  it("rejects missing headers", async () => {
    const ExcelJS = (await import("exceljs")).default;
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Bad");
    sheet.addRow(["Wrong", "Headers"]);
    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
    const parsed = await parseOpcoRegulatoryFeesExcel(buffer);
    expect(parsed.rows).toEqual([]);
    expect(parsed.issues[0]?.message).toMatch(/Missing required headers/);
  });
});

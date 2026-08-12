import { describe, expect, it } from "vitest";

import { parseServicePartnerMapsExcel } from "@/lib/admin/service-partner-maps-excel";
import ExcelJS from "exceljs";

async function workbookBuffer(
  rows: Array<[string, string]>,
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Maps");
  sheet.addRow(["ServiceOrApplicationName", "Partner"]);
  for (const row of rows) {
    sheet.addRow(row);
  }
  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

describe("parseServicePartnerMapsExcel", () => {
  it("parses valid rows", async () => {
    const buffer = await workbookBuffer([
      ["Shofha Plus", "Google"],
      ["Netflix Card", "Netflix"],
    ]);
    const parsed = await parseServicePartnerMapsExcel(buffer);
    expect(parsed.issues).toHaveLength(0);
    expect(parsed.rows).toHaveLength(2);
    expect(parsed.rows[0]?.serviceName).toBe("Shofha Plus");
    expect(parsed.rows[0]?.partnerName).toBe("Google");
  });

  it("reports missing partner as an issue", async () => {
    const buffer = await workbookBuffer([["Shofha Plus", ""]]);
    const parsed = await parseServicePartnerMapsExcel(buffer);
    expect(parsed.rows).toHaveLength(0);
    expect(parsed.issues[0]?.message).toMatch(/Missing Partner/i);
  });
});

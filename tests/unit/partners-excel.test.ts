import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";

import {
  buildPartnersTemplateBuffer,
  parsePartnersExcel,
} from "@/lib/admin/partners-excel";

async function workbookBuffer(
  headers: string[],
  rows: Array<Array<string>>,
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Partners");
  sheet.addRow(headers);
  for (const row of rows) {
    sheet.addRow(row);
  }
  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

describe("parsePartnersExcel", () => {
  it("parses valid rows and defaults status to ACTIVE", async () => {
    const buffer = await workbookBuffer(
      ["Name", "Status"],
      [
        ["Google", "ACTIVE"],
        ["Netflix", ""],
        ["Spotify", "INACTIVE"],
      ],
    );
    const parsed = await parsePartnersExcel(buffer);
    expect(parsed.issues).toHaveLength(0);
    expect(parsed.rows).toHaveLength(3);
    expect(parsed.rows[0]).toMatchObject({ name: "Google", status: "ACTIVE" });
    expect(parsed.rows[1]).toMatchObject({ name: "Netflix", status: "ACTIVE" });
    expect(parsed.rows[2]).toMatchObject({
      name: "Spotify",
      status: "INACTIVE",
    });
  });

  it("accepts Partner name header alias", async () => {
    const buffer = await workbookBuffer(["Partner"], [["Acme Media"]]);
    const parsed = await parsePartnersExcel(buffer);
    expect(parsed.issues).toHaveLength(0);
    expect(parsed.rows[0]?.name).toBe("Acme Media");
    expect(parsed.rows[0]?.status).toBe("ACTIVE");
  });

  it("reports blank name as an issue", async () => {
    const buffer = await workbookBuffer(
      ["Name", "Status"],
      [["", "ACTIVE"]],
    );
    const parsed = await parsePartnersExcel(buffer);
    expect(parsed.rows).toHaveLength(0);
    expect(parsed.issues[0]?.message).toMatch(/name is required/i);
  });

  it("reports invalid status as an issue", async () => {
    const buffer = await workbookBuffer(
      ["Name", "Status"],
      [["Google", "UNKNOWN"]],
    );
    const parsed = await parsePartnersExcel(buffer);
    expect(parsed.rows).toHaveLength(0);
    expect(parsed.issues[0]?.message).toMatch(/Invalid Status/i);
  });

  it("flags duplicate names within the sheet", async () => {
    const buffer = await workbookBuffer(
      ["Name"],
      [["Google Inc"], ["google-inc"]],
    );
    const parsed = await parsePartnersExcel(buffer);
    expect(parsed.rows).toHaveLength(1);
    expect(parsed.issues).toHaveLength(1);
    expect(parsed.issues[0]?.message).toMatch(/Duplicate partner name/i);
  });

  it("requires a Name header", async () => {
    const buffer = await workbookBuffer(["Status"], [["ACTIVE"]]);
    const parsed = await parsePartnersExcel(buffer);
    expect(parsed.rows).toHaveLength(0);
    expect(parsed.issues[0]?.message).toMatch(/Missing required header/i);
  });
});

describe("buildPartnersTemplateBuffer", () => {
  it("builds a workbook with Name and Status headers", async () => {
    const buffer = await buildPartnersTemplateBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
    const sheet = workbook.worksheets[0];
    expect(sheet).toBeTruthy();
    expect(String(sheet!.getRow(1).getCell(1).value)).toBe("Name");
    expect(String(sheet!.getRow(1).getCell(2).value)).toBe("Status");
  });
});

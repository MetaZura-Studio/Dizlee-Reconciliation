import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";

import {
  extractDistinctColumnValues,
  extractExcelHeaderCatalog,
  extractExcelHeaders,
  normalizeHeaderKey,
  parseStoredSampleHeaders,
  selectStoredSheet,
  serializeSampleHeaders,
  uniqueHeaders,
} from "@/lib/admin/opco-report-mapping-excel";
import {
  selectOpcoReportMappingSheetSchema,
  updateOpcoReportMappingSchema,
} from "@/lib/admin/validation/opco-report-mappings";
import {
  OPCO_REPORT_MAPPING_SEEDS,
  seedOpcoReportMappingHeadersJson,
} from "@/prisma/seed-data/opco-report-mappings";
import {
  assertOpcoMappingReady,
  parseOpcoReportWithMapping,
} from "@/lib/opco/excel/parse-mapped-opco-report";
import { ReportParseError } from "@/lib/platform/excel/parse-report";

async function workbookFromRows(
  headers: string[],
  rows: Array<Array<string | number>>,
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Sheet1");
  sheet.addRow(headers);
  for (const row of rows) {
    sheet.addRow(row);
  }
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

async function kuwaitStyleWorkbook(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const summary = workbook.addWorksheet("Summary");
  summary.getCell(1, 1).value =
    "Dizlee Revenue Share @ 3% From Sep2022 till Mar-2025";
  const detailed = workbook.addWorksheet("Dizlee Rev 3% - Detailed");
  detailed.addRow([
    "Type",
    "Service provider Name",
    "Service name",
    "Gross Revenue (LC)",
    "RS %",
  ]);
  detailed.addRow(["Postpaid", "Docomo", "Zain Games", 100, 0.03]);
  const apple = workbook.addWorksheet("Apple Data");
  apple.addRow(["Apple Col"]);
  apple.addRow(["x"]);
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

describe("normalizeHeaderKey", () => {
  it("normalizes punctuation and spaces", () => {
    expect(normalizeHeaderKey("Total Gross Revenue (BHD)")).toBe(
      "total_gross_revenue_bhd",
    );
    expect(normalizeHeaderKey("SERVICE_REVENUE/IQD")).toBe("service_revenue_iqd");
  });
});

describe("uniqueHeaders", () => {
  it("keeps first occurrence of duplicate labels", () => {
    expect(
      uniqueHeaders([
        "Service",
        "Dizlee Revenue Share @ 3% From Sep2022 till Mar-2025",
        "Revenue",
        "Dizlee Revenue Share @ 3% From Sep2022 till Mar-2025",
      ]),
    ).toEqual([
      "Service",
      "Dizlee Revenue Share @ 3% From Sep2022 till Mar-2025",
      "Revenue",
    ]);
  });
});

describe("extractExcelHeaders", () => {
  it("reads the first row", async () => {
    const buffer = await workbookFromRows(
      ["Merchant Name", "Service Name", "Total Gross Revenue (BHD)"],
      [["Google", "Play", 10]],
    );
    await expect(extractExcelHeaders(buffer)).resolves.toEqual([
      "Merchant Name",
      "Service Name",
      "Total Gross Revenue (BHD)",
    ]);
  });

  it("prefers the detailed sheet over a Summary title sheet", async () => {
    const buffer = await kuwaitStyleWorkbook();
    await expect(extractExcelHeaders(buffer)).resolves.toEqual([
      "Type",
      "Service provider Name",
      "Service name",
      "Gross Revenue (LC)",
      "RS %",
    ]);
  });
});

describe("sheet catalog", () => {
  it("lists every sheet and can select Summary vs Detailed", async () => {
    const buffer = await kuwaitStyleWorkbook();
    const catalog = await extractExcelHeaderCatalog(buffer);
    expect(catalog).not.toBeNull();
    expect(catalog?.sheets.map((sheet) => sheet.sheetName)).toEqual([
      "Summary",
      "Dizlee Rev 3% - Detailed",
      "Apple Data",
    ]);
    expect(catalog?.selected.sheetName).toBe("Dizlee Rev 3% - Detailed");

    const stored = parseStoredSampleHeaders(
      serializeSampleHeaders(catalog!.selected, catalog!.sheets),
    );
    const summary = selectStoredSheet(stored, "Summary");
    expect(summary?.headers).toEqual([
      "Dizlee Revenue Share @ 3% From Sep2022 till Mar-2025",
    ]);
    const detailed = selectStoredSheet(stored, "Dizlee Rev 3% - Detailed");
    expect(detailed?.headers).toContain("Service provider Name");
  });

  it("parses legacy headers array JSON", () => {
    const stored = parseStoredSampleHeaders(
      JSON.stringify(["Service Name", "Merchant Name"]),
    );
    expect(stored.headers).toEqual(["Service Name", "Merchant Name"]);
    expect(stored.sheetName).toBeNull();
    expect(stored.sheets).toEqual([]);
  });

  it("seeds sheet catalog JSON so Admin mapping is complete", () => {
    const kuwait = OPCO_REPORT_MAPPING_SEEDS.find(
      (item) => item.opcoSlug === "zain-kuwait",
    );
    expect(kuwait?.partnerMode).toBe("EXCEL_COLUMN");
    const stored = parseStoredSampleHeaders(
      seedOpcoReportMappingHeadersJson(kuwait!),
    );
    expect(stored.sheetName).toBe("Dizlee Rev 3% - Detailed");
    expect(stored.headers).toContain("Service provider Name");

    const southSudan = OPCO_REPORT_MAPPING_SEEDS.find(
      (item) => item.opcoSlug === "zain-south-sudan",
    );
    expect(southSudan?.partnerMode).toBe("EXCEL_COLUMN");
    expect(southSudan?.partnerColumn).toBe("Partner Name");
    expect(kuwait?.revenueShareColumn).toBe("RS %");

    const bahrain = OPCO_REPORT_MAPPING_SEEDS.find(
      (item) => item.opcoSlug === "zain-bahrain",
    );
    expect(bahrain?.rowFilterColumn).toBe("Aggregator Name");
    expect(bahrain?.rowFilterValue).toBe("Group API");
  });
});

describe("updateOpcoReportMappingSchema", () => {
  it("requires partner column for EXCEL_COLUMN mode", () => {
    const result = updateOpcoReportMappingSchema.safeParse({
      partnerMode: "EXCEL_COLUMN",
      serviceColumn: "Service Name",
      revenueColumn: "Total Gross Revenue",
      revenueShareColumn: "RS %",
      partnerColumn: null,
    });
    expect(result.success).toBe(false);
  });

  it("allows SERVICE_PARTNER_MAP without partner column", () => {
    const result = updateOpcoReportMappingSchema.safeParse({
      partnerMode: "SERVICE_PARTNER_MAP",
      serviceColumn: "Service",
      revenueColumn: "Revenue",
      revenueShareColumn: "Share %",
      aggregateDailyRows: true,
    });
    expect(result.success).toBe(true);
  });

  it("requires service, revenue, and revenue share columns", () => {
    const result = updateOpcoReportMappingSchema.safeParse({
      partnerMode: "UPLOAD_PICKER",
      serviceColumn: "",
      revenueColumn: "Revenue",
      revenueShareColumn: "Share %",
    });
    expect(result.success).toBe(false);
  });

  it("requires sampleSheetName for sheet selection", () => {
    expect(
      selectOpcoReportMappingSheetSchema.safeParse({ sampleSheetName: "" })
        .success,
    ).toBe(false);
    expect(
      selectOpcoReportMappingSheetSchema.safeParse({
        sampleSheetName: "Dizlee Rev 3% - Detailed",
      }).success,
    ).toBe(true);
  });
});

describe("assertOpcoMappingReady", () => {
  it("rejects incomplete service/revenue mapping", () => {
    expect(() =>
      assertOpcoMappingReady({
        serviceColumn: null,
        partnerMode: "UPLOAD_PICKER",
        partnerColumn: null,
        revenueColumn: "Revenue",
      }),
    ).toThrow(ReportParseError);
  });
});

describe("parseOpcoReportWithMapping", () => {
  it("skips rows with Partner and Service but no gross amount", async () => {
    const buffer = await workbookFromRows(
      ["Merchant Name", "Service Name", "Total Gross Revenue (BHD)"],
      [
        ["Google", "Play Gift Card", 100.5],
        ["Netflix", "Unused Service", ""],
        ["Centili", "Dash Row", "-"],
        ["OSN", "Zero Listed", 0],
      ],
    );
    const parsed = await parseOpcoReportWithMapping(buffer, {
      serviceColumn: "Service Name",
      partnerMode: "EXCEL_COLUMN",
      partnerColumn: "Merchant Name",
      revenueColumn: "Total Gross Revenue",
      revenueShareColumn: null,
      aggregateDailyRows: false,
    });
    expect(parsed.partnerColumnLines).toHaveLength(2);
    expect(parsed.partnerColumnLines.map((line) => line.partnerName)).toEqual([
      "Google",
      "OSN",
    ]);
    expect(parsed.partnerColumnLines[1]?.amount).toBe(0);
  });

  it("parses EXCEL_COLUMN Bahrain-style rows including (BHD) revenue header", async () => {
    const buffer = await workbookFromRows(
      ["Merchant Name", "Service Name", "Total Gross Revenue (BHD)"],
      [
        ["Google", "Play Gift Card", 100.5],
        ["Netflix", "Streaming", 50],
      ],
    );
    const parsed = await parseOpcoReportWithMapping(buffer, {
      serviceColumn: "Service Name",
      partnerMode: "EXCEL_COLUMN",
      partnerColumn: "Merchant Name",
      revenueColumn: "Total Gross Revenue",
      revenueShareColumn: null,
      aggregateDailyRows: false,
    });
    expect(parsed.partnerColumnLines).toHaveLength(2);
    expect(parsed.partnerColumnLines[0]?.partnerName).toBe("Google");
    expect(parsed.partnerColumnLines[0]?.amount).toBe(100.5);
    expect(parsed.partnerColumnLines[1]?.partnerKey).toBe("netflix");
  });

  it("parses Kuwait Service provider Name and Gross Revenue (LC)", async () => {
    const buffer = await workbookFromRows(
      ["Service provider Name", "Service name", "Gross Revenue (LC)", "Net"],
      [["Digital Virgo", "League Cards", 109773, 1]],
    );
    const parsed = await parseOpcoReportWithMapping(buffer, {
      serviceColumn: "Service name",
      partnerMode: "EXCEL_COLUMN",
      partnerColumn: "Service provider Name",
      revenueColumn: "Gross Revenue (LC)",
      revenueShareColumn: null,
      aggregateDailyRows: false,
    });
    expect(parsed.partnerColumnLines).toHaveLength(1);
    expect(parsed.partnerColumnLines[0]?.partnerName).toBe("Digital Virgo");
    expect(parsed.partnerColumnLines[0]?.amount).toBe(109773);
  });

  it("prefers the configured sheet name in a multi-sheet workbook", async () => {
    const buffer = await kuwaitStyleWorkbook();
    const parsed = await parseOpcoReportWithMapping(buffer, {
      serviceColumn: "Service name",
      partnerMode: "EXCEL_COLUMN",
      partnerColumn: "Service provider Name",
      revenueColumn: "Gross Revenue (LC)",
      revenueShareColumn: null,
      aggregateDailyRows: false,
      preferredSheetName: "Dizlee Rev 3% - Detailed",
    });
    expect(parsed.partnerColumnLines).toHaveLength(1);
    expect(parsed.partnerColumnLines[0]?.partnerName).toBe("Docomo");
    expect(parsed.partnerColumnLines[0]?.amount).toBe(100);
  });

  it("aggregates daily SERVICE_PARTNER_MAP rows when enabled", async () => {
    const buffer = await workbookFromRows(
      ["Date", "Service", "Revenue"],
      [
        ["2026-01-01", "Shofha Plus", 10],
        ["2026-01-02", "Shofha Plus", 15.5],
        ["2026-01-01", "Other", 3],
      ],
    );
    const parsed = await parseOpcoReportWithMapping(buffer, {
      serviceColumn: "Service",
      partnerMode: "SERVICE_PARTNER_MAP",
      partnerColumn: null,
      revenueColumn: "Revenue",
      revenueShareColumn: null,
      aggregateDailyRows: true,
    });
    expect(parsed.serviceMapLines).toHaveLength(2);
    const shofha = parsed.serviceMapLines.find(
      (line) => line.serviceKey === "shofha plus",
    );
    expect(shofha?.amount).toBe(25.5);
  });

  it("stores optional revenue share on the line and in sourceColumns", async () => {
    const buffer = await workbookFromRows(
      ["Service", "Revenue", "Share %"],
      [["App", 100, 30]],
    );
    const parsed = await parseOpcoReportWithMapping(buffer, {
      serviceColumn: "Service",
      partnerMode: "UPLOAD_PICKER",
      partnerColumn: null,
      revenueColumn: "Revenue",
      revenueShareColumn: "Share %",
      aggregateDailyRows: false,
    });
    expect(parsed.pickerLines[0]?.revenueSharePercent).toBe(30);
    expect(parsed.pickerLines[0]?.sourceColumns.revenue_share_percent).toBe(30);
  });

  it("keeps only rows matching the Aggregator Name filter", async () => {
    const buffer = await workbookFromRows(
      [
        "Aggregator Name",
        "Merchant Name",
        "Service Name",
        "Total Gross Revenue",
      ],
      [
        ["Boku/Apple", "APPLE DCB", "Apple iTunes", 87370],
        ["Group API", "DIGITAL VIRGO", "BollyVOD", 1630],
        ["Group API", "CENTILI", "Zee5", 1.877],
      ],
    );
    const parsed = await parseOpcoReportWithMapping(buffer, {
      serviceColumn: "Service Name",
      partnerMode: "EXCEL_COLUMN",
      partnerColumn: "Merchant Name",
      revenueColumn: "Total Gross Revenue",
      revenueShareColumn: null,
      rowFilterColumn: "Aggregator Name",
      rowFilterValue: "Group API",
      aggregateDailyRows: false,
    });
    expect(parsed.partnerColumnLines).toHaveLength(2);
    expect(parsed.partnerColumnLines.map((line) => line.serviceName)).toEqual([
      "BollyVOD",
      "Zee5",
    ]);
  });
});

describe("extractDistinctColumnValues", () => {
  it("returns sorted distinct non-empty values for a column", async () => {
    const buffer = await workbookFromRows(
      ["Aggregator Name", "Service Name"],
      [
        ["Group API", "BollyVOD"],
        ["Boku/Apple", "Apple iTunes"],
        ["Group API", "Zee5"],
        ["", "Empty aggregator row"],
      ],
    );

    const values = await extractDistinctColumnValues(buffer, {
      sheetName: "Sheet1",
      headerRowNumber: 1,
      columnHeader: "Aggregator Name",
    });

    expect(values).toEqual(["Boku/Apple", "Group API"]);
  });

  it("returns empty list when the column header is missing", async () => {
    const buffer = await workbookFromRows(
      ["Service Name"],
      [["BollyVOD"]],
    );

    const values = await extractDistinctColumnValues(buffer, {
      sheetName: "Sheet1",
      headerRowNumber: 1,
      columnHeader: "Aggregator Name",
    });

    expect(values).toEqual([]);
  });

  it("reads distinct Aggregator Name values from the Bahrain OpCo sample", async () => {
    const buffer = readFileSync(
      path.join(
        process.cwd(),
        "Reports/Opco Reports- Marked/Zain Bahrain-Apr26.xlsx",
      ),
    );

    const values = await extractDistinctColumnValues(buffer, {
      sheetName: "Summary",
      headerRowNumber: 1,
      columnHeader: "Aggregator Name",
    });

    expect(values).toContain("Group API");
    expect(values.length).toBeGreaterThan(1);
  });
});

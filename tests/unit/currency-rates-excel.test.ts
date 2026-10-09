import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";

import {
  buildCurrencyRatesTemplateBuffer,
  mergeParsedRatesIntoDraft,
  parseCurrencyRatesExcel,
} from "@/lib/admin/currency-rates-excel";
import {
  buildRollingPeriods,
  isSameCalendarPeriod,
} from "@/lib/platform/currency-rates";

async function workbookBuffer(
  rows: Array<[string, string | number | ""]>,
  rateHeader = "RateToUSD",
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Rates");
  sheet.addRow(["ISO", rateHeader]);
  for (const row of rows) {
    sheet.addRow(row);
  }
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

describe("parseCurrencyRatesExcel", () => {
  it("parses UnitsPerUSD as local-per-USD and stores inverted rateToUsd", async () => {
    const buffer = await workbookBuffer(
      [
        ["KWD", 1 / 3.25],
        ["SAR", 1 / 0.27],
      ],
      "UnitsPerUSD",
    );
    const result = await parseCurrencyRatesExcel(buffer);

    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]?.isoCode).toBe("KWD");
    expect(result.rows[0]?.rateToUsd).toBeCloseTo(3.25, 10);
    expect(result.rows[1]?.isoCode).toBe("SAR");
    expect(result.rows[1]?.rateToUsd).toBeCloseTo(0.27, 10);
    expect(result.issues).toEqual([]);
  });

  it("parses legacy RateToUSD as stored rateToUsd without invert", async () => {
    const buffer = await workbookBuffer([
      ["KWD", 3.25],
      ["SAR", "0.27"],
    ]);
    const result = await parseCurrencyRatesExcel(buffer);

    expect(result.rows).toEqual([
      { isoCode: "KWD", rateToUsd: 3.25, rowNumber: 2 },
      { isoCode: "SAR", rateToUsd: 0.27, rowNumber: 3 },
    ]);
    expect(result.issues).toEqual([]);
  });

  it("rejects negative rates and bad ISO", async () => {
    const buffer = await workbookBuffer([
      ["KW", 1],
      ["EUR", -2],
    ]);
    const result = await parseCurrencyRatesExcel(buffer);

    expect(result.rows).toEqual([]);
    expect(result.issues.length).toBe(2);
  });

  it("skips non-1 USD rows with an issue", async () => {
    const buffer = await workbookBuffer([["USD", 2]]);
    const result = await parseCurrencyRatesExcel(buffer);

    expect(result.rows).toEqual([]);
    expect(result.issues[0]?.message).toMatch(/USD rate must be 1/i);
  });

  it("still accepts legacy RateToKWD header", async () => {
    const buffer = await workbookBuffer([["SAR", 0.27]], "RateToKWD");
    const result = await parseCurrencyRatesExcel(buffer);
    expect(result.rows).toEqual([
      { isoCode: "SAR", rateToUsd: 0.27, rowNumber: 2 },
    ]);
  });

  it("builds a template with UnitsPerUSD rounded to currency decimals", async () => {
    const buffer = await buildCurrencyRatesTemplateBuffer([
      { isoCode: "USD", rateToUsd: 1, decimalPrecision: 2 },
      { isoCode: "KWD", rateToUsd: 3.25, decimalPrecision: 3 },
      { isoCode: "SDG", rateToUsd: 1 / 2.76, decimalPrecision: 2 },
    ]);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
    const sheet = workbook.worksheets[0];
    expect(sheet).toBeTruthy();
    expect(String(sheet!.getRow(1).getCell(2).value)).toBe("UnitsPerUSD");
    // Row 2 is the instruction note (skipped by import parser)
    expect(sheet!.getRow(3).getCell(1).value).toBe("USD");
    expect(sheet!.getRow(3).getCell(2).value).toBe(1);
    expect(sheet!.getRow(4).getCell(1).value).toBe("KWD");
    // 1/3.25 → 0.3076… rounded to KWD’s 3 decimals
    expect(sheet!.getRow(4).getCell(2).value).toBe(0.308);
    expect(sheet!.getRow(5).getCell(1).value).toBe("SDG");
    expect(sheet!.getRow(5).getCell(2).value).toBe(2.76);
  });
});

describe("mergeParsedRatesIntoDraft", () => {
  it("fills matching currencies and keeps existing others", () => {
    const result = mergeParsedRatesIntoDraft({
      currencies: [
        { id: "1", isoCode: "USD" },
        { id: "2", isoCode: "KWD" },
        { id: "3", isoCode: "SAR" },
      ],
      existingRates: [
        { currencyId: "1", rateToUsd: 1 },
        { currencyId: "2", rateToUsd: 3.2 },
        { currencyId: "3", rateToUsd: 0.26 },
      ],
      parsedRows: [{ isoCode: "KWD", rateToUsd: 3.25, rowNumber: 2 }],
    });

    expect(result.applied).toBe(1);
    expect(result.rates).toEqual([
      { currencyId: "1", rateToUsd: 1 },
      { currencyId: "2", rateToUsd: 3.25 },
      { currencyId: "3", rateToUsd: 0.26 },
    ]);
  });

  it("reports unknown ISO codes", () => {
    const result = mergeParsedRatesIntoDraft({
      currencies: [{ id: "1", isoCode: "USD" }],
      existingRates: [{ currencyId: "1", rateToUsd: 1 }],
      parsedRows: [{ isoCode: "ZZZ", rateToUsd: 2, rowNumber: 2 }],
    });

    expect(result.skippedUnknown).toEqual(["ZZZ"]);
  });
});

describe("calendar period helpers", () => {
  it("buildRollingPeriods includes current and walks backward", () => {
    expect(buildRollingPeriods({ month: 3, year: 2026 }, 3)).toEqual([
      { month: 3, year: 2026 },
      { month: 2, year: 2026 },
      { month: 1, year: 2026 },
    ]);
    expect(buildRollingPeriods({ month: 1, year: 2026 }, 2)).toEqual([
      { month: 1, year: 2026 },
      { month: 12, year: 2025 },
    ]);
  });

  it("isSameCalendarPeriod compares month and year", () => {
    expect(isSameCalendarPeriod(7, 2026, { month: 7, year: 2026 })).toBe(true);
    expect(isSameCalendarPeriod(6, 2026, { month: 7, year: 2026 })).toBe(false);
  });
});

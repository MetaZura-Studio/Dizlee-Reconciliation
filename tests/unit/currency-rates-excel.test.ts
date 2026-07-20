import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";

import {
  mergeParsedRatesIntoDraft,
  parseCurrencyRatesExcel,
} from "@/lib/admin/currency-rates-excel";
import {
  buildRollingPeriods,
  isSameCalendarPeriod,
} from "@/lib/platform/currency-rates";

async function workbookBuffer(
  rows: Array<[string, string | number | ""]>,
  rateHeader = "RateToKWD",
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
  it("parses valid ISO and rate rows", async () => {
    const buffer = await workbookBuffer([
      ["USD", 0.308],
      ["SAR", "1.15"],
    ]);
    const result = await parseCurrencyRatesExcel(buffer);

    expect(result.rows).toEqual([
      { isoCode: "USD", rateToUsd: 0.308, rowNumber: 2 },
      { isoCode: "SAR", rateToUsd: 1.15, rowNumber: 3 },
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

  it("skips non-1 KWD rows with an issue", async () => {
    const buffer = await workbookBuffer([["KWD", 2]]);
    const result = await parseCurrencyRatesExcel(buffer);

    expect(result.rows).toEqual([]);
    expect(result.issues[0]?.message).toMatch(/KWD rate must be 1/i);
  });

  it("still accepts legacy RateToUSD header", async () => {
    const buffer = await workbookBuffer([["SAR", 1.15]], "RateToUSD");
    const result = await parseCurrencyRatesExcel(buffer);
    expect(result.rows).toEqual([
      { isoCode: "SAR", rateToUsd: 1.15, rowNumber: 2 },
    ]);
  });
});

describe("mergeParsedRatesIntoDraft", () => {
  it("fills matching currencies and keeps existing others", () => {
    const result = mergeParsedRatesIntoDraft({
      currencies: [
        { id: "1", isoCode: "KWD" },
        { id: "2", isoCode: "USD" },
        { id: "3", isoCode: "SAR" },
      ],
      existingRates: [
        { currencyId: "1", rateToUsd: 1 },
        { currencyId: "2", rateToUsd: 0.3 },
        { currencyId: "3", rateToUsd: 1.1 },
      ],
      parsedRows: [{ isoCode: "USD", rateToUsd: 0.31, rowNumber: 2 }],
    });

    expect(result.applied).toBe(1);
    expect(result.rates).toEqual([
      { currencyId: "1", rateToUsd: 1 },
      { currencyId: "2", rateToUsd: 0.31 },
      { currencyId: "3", rateToUsd: 1.1 },
    ]);
  });

  it("reports unknown ISO codes", () => {
    const result = mergeParsedRatesIntoDraft({
      currencies: [{ id: "1", isoCode: "KWD" }],
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

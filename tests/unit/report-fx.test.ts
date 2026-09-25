import { describe, expect, it } from "vitest";

import {
  applyReportFxToAmount,
  formatFxNumber,
  PartnerReportFxError,
  snapshotFxOntoParsedLines,
  snapshotFxOntoParsedLinesByCurrency,
} from "@/lib/platform/report-fx";
import { mapParsedLinesToPreview } from "@/lib/platform/report-preview";

describe("applyReportFxToAmount", () => {
  it("converts local amount to USD using the system rate (USD 2dp)", () => {
    expect(applyReportFxToAmount(28, 0.2667)).toEqual({
      exchangeRate: "0.2667",
      amountUsd: "7.47",
    });
  });

  it("returns null USD when the monthly rate is missing", () => {
    expect(applyReportFxToAmount(28, null)).toEqual({
      exchangeRate: null,
      amountUsd: null,
    });
  });
});

describe("snapshotFxOntoParsedLines", () => {
  const sampleLine = {
    lineNumber: 1,
    description: "7adir",
    usageAmount: null as number | null,
    usageUsd: null as number | null,
    amount: 28 as number | null,
    revenueSharePercent: null as number | null,
    exchangeRate: null as number | null,
    usageUnit: null as string | null,
    reconciliationBasis: null as string | null,
    currencyCode: null as string | null,
    sourceColumns: {},
  };

  it("stamps exchange rate and USD amount onto lines", () => {
    const [line] = snapshotFxOntoParsedLines([sampleLine], 0.2667);
    expect(line.exchangeRate).toBe(0.2667);
    expect(line.usageUsd).toBe(7.47);
    expect(line.amount).toBe(28);
  });

  it("leaves lines unchanged when monthly rate is missing", () => {
    const [line] = snapshotFxOntoParsedLines([sampleLine], null);
    expect(line.exchangeRate).toBeNull();
    expect(line.usageUsd).toBeNull();
  });
});

describe("snapshotFxOntoParsedLinesByCurrency", () => {
  const rates = new Map<string, number>([
    ["USD", 1],
    ["KWD", 3.25],
    ["SAR", 0.2667],
  ]);

  it("keeps USD rows as-is and converts KWD/SAR", () => {
    const lines = snapshotFxOntoParsedLinesByCurrency(
      [
        {
          lineNumber: 1,
          amount: 100,
          exchangeRate: null,
          usageUsd: null,
          currencyCode: "USD",
        },
        {
          lineNumber: 2,
          amount: 10,
          exchangeRate: null,
          usageUsd: null,
          currencyCode: "KWD",
        },
        {
          lineNumber: 3,
          amount: 28,
          exchangeRate: null,
          usageUsd: null,
          currencyCode: "SAR",
        },
      ],
      rates,
    );

    expect(lines[0]).toMatchObject({
      amount: 100,
      exchangeRate: 1,
      usageUsd: 100,
      currencyCode: "USD",
    });
    expect(lines[1]).toMatchObject({
      amount: 10,
      exchangeRate: 3.25,
      usageUsd: 32.5,
      currencyCode: "KWD",
    });
    expect(lines[2]).toMatchObject({
      amount: 28,
      exchangeRate: 0.2667,
      usageUsd: 7.47,
      currencyCode: "SAR",
    });
  });

  it("treats blank currency as USD", () => {
    const [line] = snapshotFxOntoParsedLinesByCurrency(
      [
        {
          lineNumber: 1,
          amount: 50,
          exchangeRate: null,
          usageUsd: null,
          currencyCode: null,
        },
      ],
      rates,
    );
    expect(line).toMatchObject({
      amount: 50,
      exchangeRate: 1,
      usageUsd: 50,
      currencyCode: "USD",
    });
  });

  it("throws when rate is missing for a currency", () => {
    expect(() =>
      snapshotFxOntoParsedLinesByCurrency(
        [
          {
            lineNumber: 4,
            amount: 10,
            exchangeRate: null,
            usageUsd: null,
            currencyCode: "IQD",
          },
        ],
        rates,
      ),
    ).toThrow(PartnerReportFxError);
  });
});

describe("mapParsedLinesToPreview", () => {
  it("applies FX onto parsed line items", () => {
    const lines = mapParsedLinesToPreview(
      [
        {
          lineNumber: 1,
          description: "7adir",
          usageAmount: null,
          usageUsd: null,
          amount: 28,
          revenueSharePercent: null,
          exchangeRate: null,
          usageUnit: null,
          reconciliationBasis: null,
          currencyCode: null,
          sourceColumns: {},
        },
      ],
      { currencyCode: "SAR", rateToUsd: 0.2667 },
    );

    expect(lines[0]).toMatchObject({
      description: "7adir",
      amount: "28.00",
      exchangeRate: "0.2667",
      amountUsd: "7.47",
    });
  });
});

describe("formatFxNumber", () => {
  it("trims trailing zeros", () => {
    expect(formatFxNumber(1)).toBe("1");
  });
});

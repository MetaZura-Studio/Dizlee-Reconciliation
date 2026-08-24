import { describe, expect, it } from "vitest";

import { applyReportFxToAmount, formatFxNumber } from "@/lib/platform/report-fx";
import { mapParsedLinesToPreview } from "@/lib/platform/report-preview";

describe("applyReportFxToAmount", () => {
  it("converts local amount to USD using the system rate", () => {
    expect(applyReportFxToAmount(28, 0.2667)).toEqual({
      exchangeRate: "0.2667",
      amountUsd: "7.4676",
    });
  });

  it("returns null USD when the monthly rate is missing", () => {
    expect(applyReportFxToAmount(28, null)).toEqual({
      exchangeRate: null,
      amountUsd: null,
    });
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
          sourceColumns: {},
        },
      ],
      { currencyCode: "SAR", rateToUsd: 0.2667 },
    );

    expect(lines[0]).toMatchObject({
      description: "7adir",
      amount: "28",
      exchangeRate: "0.2667",
      amountUsd: "7.4676",
    });
  });
});

describe("formatFxNumber", () => {
  it("trims trailing zeros", () => {
    expect(formatFxNumber(1)).toBe("1");
  });
});

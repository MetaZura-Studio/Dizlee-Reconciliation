import { describe, expect, it } from "vitest";

import {
  adminConversionRateFromStored,
  formatRateInput,
  localPerUsdFromStoredRateToUsd,
  sanitizeRateInput,
  storedRateToUsdFromAdminConversion,
  storedRateToUsdFromLocalPerUsd,
} from "@/lib/admin/currency-rate-input";
import { isSameCalendarPeriod } from "@/lib/platform/currency-rates";
import {
  currencyFxFactorLabel,
  currencyUsesDivideFx,
} from "@/lib/platform/currency-fx-factor";
import { applyReportFxToAmount } from "@/lib/platform/report-fx";
import { CURRENCY_SEEDS } from "@/prisma/seed-data/currencies";

describe("formatRateInput", () => {
  it("avoids scientific notation for tiny rates", () => {
    expect(formatRateInput(3e-8)).toBe("0.00000003");
    expect(formatRateInput(0.00000003)).toBe("0.00000003");
  });

  it("trims trailing zeros", () => {
    expect(formatRateInput(3.25)).toBe("3.25");
    expect(formatRateInput(1)).toBe("1");
    expect(formatRateInput(1.5)).toBe("1.5");
  });
});

describe("FX factor by ISO", () => {
  it("divides IQD, SDG, SSP and multiplies other OpCo currencies", () => {
    expect(currencyUsesDivideFx("IQD")).toBe(true);
    expect(currencyUsesDivideFx("SDG")).toBe(true);
    expect(currencyUsesDivideFx("SSP")).toBe(true);
    expect(currencyUsesDivideFx("JOD")).toBe(false);
    expect(currencyUsesDivideFx("KWD")).toBe(false);
    expect(currencyFxFactorLabel("JOD")).toBe("Multiply");
    expect(currencyFxFactorLabel("IQD")).toBe("Divide");
  });
});

describe("Admin conversion rate <-> rateToUsd", () => {
  it("stores multiply conversion rates as rateToUsd", () => {
    expect(storedRateToUsdFromAdminConversion(1.41, "JOD")).toBe(1.41);
    expect(storedRateToUsdFromAdminConversion(2.65, "BHD")).toBe(2.65);
    expect(storedRateToUsdFromAdminConversion(0.27, "SAR")).toBe(0.27);
    expect(storedRateToUsdFromAdminConversion(3.2, "KWD")).toBe(3.2);
    expect(adminConversionRateFromStored(1.41, "JOD")).toBe(1.41);
  });

  it("stores divide conversion rates as inverted rateToUsd", () => {
    expect(storedRateToUsdFromAdminConversion(8000, "SDG")).toBe(0.000125);
    expect(storedRateToUsdFromAdminConversion(1520, "IQD")).toBe(0.00065789);
    expect(adminConversionRateFromStored(0.000125, "SDG")).toBe(8000);
    const iqdStored = storedRateToUsdFromAdminConversion(1520, "IQD");
    // Must not drift to 1520.011 after 8-dp store + invert
    expect(adminConversionRateFromStored(iqdStored, "IQD")).toBe(1520);
  });

  it("matches client sheet examples after FX apply", () => {
    // JOD multiply: 1000 × 1.41 = 1410
    const jodStored = storedRateToUsdFromAdminConversion(1.41, "JOD")!;
    expect(applyReportFxToAmount(1000, jodStored).amountUsd).toBe("1410");

    // SDG divide: 1_000_000 / 8000 = 125
    const sdgStored = storedRateToUsdFromAdminConversion(8000, "SDG")!;
    expect(applyReportFxToAmount(1_000_000, sdgStored).amountUsd).toBe("125");

    // IQD divide: 1000 / 1520 ≈ 0.66
    const iqdStored = storedRateToUsdFromAdminConversion(1520, "IQD")!;
    expect(applyReportFxToAmount(1000, iqdStored).amountUsd).toBe("0.66");
  });

  it("rejects non-positive conversion rates", () => {
    expect(storedRateToUsdFromAdminConversion(null, "JOD")).toBeNull();
    expect(storedRateToUsdFromAdminConversion(0, "SDG")).toBeNull();
    expect(adminConversionRateFromStored(null, "JOD")).toBeNull();
  });
});

describe("legacy local-per-USD helpers", () => {
  it("still invert for legacy Excel UnitsPerUSD", () => {
    expect(localPerUsdFromStoredRateToUsd(3.25)).toBeCloseTo(1 / 3.25, 10);
    expect(storedRateToUsdFromLocalPerUsd(2.76)).toBe(0.36231884);
  });
});

describe("sanitizeRateInput", () => {
  it("strips non-numeric characters and extra dots", () => {
    expect(sanitizeRateInput("3.2.5")).toBe("3.25");
    expect(sanitizeRateInput("abc1.2def")).toBe("1.2");
  });

  it("caps fraction length at 8 decimals by default", () => {
    expect(sanitizeRateInput("1.123456789")).toBe("1.12345678");
  });

  it("caps Admin conversion input to the currency decimal precision", () => {
    expect(sanitizeRateInput("2.769", 2)).toBe("2.76");
    expect(sanitizeRateInput("0.3077", 3)).toBe("0.307");
    expect(formatRateInput(2.7600001, 2)).toBe("2.76");
  });

  it("prefixes leading dot with zero", () => {
    expect(sanitizeRateInput(".5")).toBe("0.5");
  });

  it("allows empty and trailing dot while typing", () => {
    expect(sanitizeRateInput("")).toBe("");
    expect(sanitizeRateInput("12.")).toBe("12.");
  });
});

describe("current-month edit lock", () => {
  it("isSameCalendarPeriod distinguishes current from past", () => {
    const current = { month: 9, year: 2026 };
    expect(isSameCalendarPeriod(9, 2026, current)).toBe(true);
    expect(isSameCalendarPeriod(4, 2026, current)).toBe(false);
  });
});

describe("OpCo currency catalog", () => {
  it("seeds only USD and OpCo settlement currencies", () => {
    const codes = CURRENCY_SEEDS.map((c) => c.isoCode).sort();
    expect(codes).toEqual([
      "BHD",
      "IQD",
      "JOD",
      "KWD",
      "SAR",
      "SDG",
      "SSP",
      "USD",
    ]);
    expect(codes).not.toContain("EUR");
    expect(codes).not.toContain("GBP");
    expect(codes).not.toContain("AED");
    expect(codes).not.toContain("OMR");
  });
});

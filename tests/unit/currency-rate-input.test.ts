import { describe, expect, it } from "vitest";

import {
  formatRateInput,
  localPerUsdFromStoredRateToUsd,
  sanitizeRateInput,
  storedRateToUsdFromLocalPerUsd,
} from "@/lib/admin/currency-rate-input";
import { isSameCalendarPeriod } from "@/lib/platform/currency-rates";

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

describe("Admin USD-left invert helpers", () => {
  it("converts stored rateToUsd to local-per-USD for display", () => {
    expect(localPerUsdFromStoredRateToUsd(3.25)).toBeCloseTo(1 / 3.25, 10);
    expect(localPerUsdFromStoredRateToUsd(1)).toBe(1);
    expect(localPerUsdFromStoredRateToUsd(null)).toBeNull();
    expect(localPerUsdFromStoredRateToUsd(0)).toBeNull();
    expect(localPerUsdFromStoredRateToUsd(-2)).toBeNull();
  });

  it("converts local-per-USD input back to stored rateToUsd", () => {
    expect(storedRateToUsdFromLocalPerUsd(1 / 3.25)).toBeCloseTo(3.25, 10);
    expect(storedRateToUsdFromLocalPerUsd(1)).toBe(1);
    expect(storedRateToUsdFromLocalPerUsd(null)).toBeNull();
    expect(storedRateToUsdFromLocalPerUsd(0)).toBeNull();
  });

  it("rounds inverted rates to 8 decimals so 1 USD = 2.76 SDG can save", () => {
    // Raw 1/2.76 has more than 8 decimals and previously failed Zod validation.
    expect(storedRateToUsdFromLocalPerUsd(2.76)).toBe(0.36231884);
  });

  it("round-trips without changing the stored rate", () => {
    const stored = 3.25;
    const shown = localPerUsdFromStoredRateToUsd(stored);
    expect(storedRateToUsdFromLocalPerUsd(shown)).toBeCloseTo(stored, 10);
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

  it("caps Admin local-per-USD input to the currency decimal precision", () => {
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

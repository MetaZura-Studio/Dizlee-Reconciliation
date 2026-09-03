import { describe, expect, it } from "vitest";

import {
  formatRateInput,
  sanitizeRateInput,
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

describe("sanitizeRateInput", () => {
  it("strips non-numeric characters and extra dots", () => {
    expect(sanitizeRateInput("3.2.5")).toBe("3.25");
    expect(sanitizeRateInput("abc1.2def")).toBe("1.2");
  });

  it("caps fraction length at 8 decimals", () => {
    expect(sanitizeRateInput("1.123456789")).toBe("1.12345678");
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

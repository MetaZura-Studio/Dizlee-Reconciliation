import { describe, expect, it } from "vitest";

import {
  clampPeriodToPresent,
  getMaxUploadMonthForYear,
  getUploadYearOptions,
  isFuturePeriod,
} from "@/lib/platform/period";
import { parseDashboardPeriod as parseOpcoDashboardPeriod } from "@/lib/opco/period";
import { parseDashboardPeriod as parsePartnerDashboardPeriod } from "@/lib/partner/period";

describe("upload period constraints", () => {
  const now = new Date(2026, 6, 15); // July 2026

  it("does not allow years after the current year", () => {
    expect(getUploadYearOptions(now)).toEqual([
      2026, 2025, 2024, 2023, 2022,
    ]);
  });

  it("limits months for the current year", () => {
    expect(getMaxUploadMonthForYear(2026, now)).toBe(7);
    expect(getMaxUploadMonthForYear(2025, now)).toBe(12);
  });

  it("detects future periods", () => {
    expect(isFuturePeriod(2026, 7, now)).toBe(false);
    expect(isFuturePeriod(2026, 8, now)).toBe(true);
    expect(isFuturePeriod(2027, 1, now)).toBe(true);
  });

  it("clamps future periods to the current month", () => {
    expect(clampPeriodToPresent(2027, 1, now)).toEqual({ year: 2026, month: 7 });
    expect(clampPeriodToPresent(2026, 8, now)).toEqual({ year: 2026, month: 7 });
    expect(clampPeriodToPresent(2026, 7, now)).toEqual({ year: 2026, month: 7 });
    expect(clampPeriodToPresent(2025, 12, now)).toEqual({ year: 2025, month: 12 });
  });

  it("clamps dashboard period query params on the server", () => {
    expect(parseOpcoDashboardPeriod("2027", "1", now)).toEqual({
      year: 2026,
      month: 7,
    });
    expect(parsePartnerDashboardPeriod("2026", "12", now)).toEqual({
      year: 2026,
      month: 7,
    });
  });
});

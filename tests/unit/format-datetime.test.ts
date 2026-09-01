import { describe, expect, it } from "vitest";

import {
  formatAppDate,
  formatAppDateTime,
  formatAppMonthYear,
} from "@/lib/platform/format-datetime";

describe("formatAppDate", () => {
  it("formats as dd/mm/yyyy", () => {
    expect(formatAppDate("2026-08-28T10:30:00.000Z")).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
  });

  it("returns em dash for null and invalid", () => {
    expect(formatAppDate(null)).toBe("—");
    expect(formatAppDate("")).toBe("—");
    expect(formatAppDate("not-a-date")).toBe("—");
  });
});

describe("formatAppDateTime", () => {
  it("includes date and 24-hour time", () => {
    const result = formatAppDateTime("2026-08-28T14:30:00");
    expect(result).toMatch(/^\d{2}\/\d{2}\/\d{4}, \d{2}:\d{2}$/);
  });

  it("returns em dash for null and invalid", () => {
    expect(formatAppDateTime(null)).toBe("—");
    expect(formatAppDateTime(undefined)).toBe("—");
    expect(formatAppDateTime("bad")).toBe("—");
  });
});

describe("formatAppMonthYear", () => {
  it("formats month/year as mm/yyyy", () => {
    expect(formatAppMonthYear(8, 2026)).toBe("08/2026");
    expect(formatAppMonthYear(1, 2025)).toBe("01/2025");
  });

  it("returns em dash for invalid month", () => {
    expect(formatAppMonthYear(0, 2026)).toBe("—");
    expect(formatAppMonthYear(13, 2026)).toBe("—");
    expect(formatAppMonthYear(1.5, 2026)).toBe("—");
  });
});

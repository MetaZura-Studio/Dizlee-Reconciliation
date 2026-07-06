import { describe, expect, it } from "vitest";

import { parseOpcoReportListFilters } from "@/lib/opco/queries/reports";

describe("parseOpcoReportListFilters", () => {
  it("defaults to uploaded desc on page 1", () => {
    const result = parseOpcoReportListFilters(new URLSearchParams());

    expect(result).toEqual({
      year: undefined,
      month: undefined,
      partnerId: undefined,
      statusCode: undefined,
      sortBy: "uploaded",
      sortDir: "desc",
      page: 1,
    });
  });

  it("parses period and entity filters", () => {
    const result = parseOpcoReportListFilters(
      new URLSearchParams({
        year: "2026",
        month: "7",
        partnerId: "12",
        status: "SUBMITTED",
      }),
    );

    expect(result).toEqual({
      year: 2026,
      month: 7,
      partnerId: "12",
      statusCode: "SUBMITTED",
      sortBy: "uploaded",
      sortDir: "desc",
      page: 1,
    });
  });

  it("parses sort and pagination", () => {
    const result = parseOpcoReportListFilters(
      new URLSearchParams({
        sortBy: "partner",
        sortDir: "asc",
        page: "3",
      }),
    );

    expect(result).toEqual({
      year: undefined,
      month: undefined,
      partnerId: undefined,
      statusCode: undefined,
      sortBy: "partner",
      sortDir: "asc",
      page: 3,
    });
  });

  it("ignores invalid values", () => {
    const result = parseOpcoReportListFilters(
      new URLSearchParams({
        year: "abc",
        month: "99",
        page: "0",
        sortBy: "invalid",
      }),
    );

    expect(result.year).toBeUndefined();
    expect(result.month).toBeUndefined();
    expect(result.page).toBe(1);
    expect(result.sortBy).toBe("uploaded");
  });
});

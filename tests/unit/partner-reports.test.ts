import { describe, expect, it } from "vitest";

import { parsePartnerReportListFilters } from "@/lib/partner/queries/reports";

describe("parsePartnerReportListFilters", () => {
  it("defaults to uploaded desc on page 1", () => {
    const result = parsePartnerReportListFilters(new URLSearchParams());

    expect(result).toEqual({
      year: undefined,
      month: undefined,
      opcoId: undefined,
      statusCode: undefined,
      sortBy: "uploaded",
      sortDir: "desc",
      page: 1,
    });
  });

  it("parses period and entity filters", () => {
    const result = parsePartnerReportListFilters(
      new URLSearchParams({
        year: "2026",
        month: "7",
        opcoId: "3",
        status: "SUBMITTED",
      }),
    );

    expect(result).toEqual({
      year: 2026,
      month: 7,
      opcoId: "3",
      statusCode: "SUBMITTED",
      sortBy: "uploaded",
      sortDir: "desc",
      page: 1,
    });
  });

  it("parses sort and pagination", () => {
    const result = parsePartnerReportListFilters(
      new URLSearchParams({
        sortBy: "opco",
        sortDir: "asc",
        page: "3",
      }),
    );

    expect(result).toEqual({
      year: undefined,
      month: undefined,
      opcoId: undefined,
      statusCode: undefined,
      sortBy: "opco",
      sortDir: "asc",
      page: 3,
    });
  });

  it("ignores invalid values", () => {
    const result = parsePartnerReportListFilters(
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

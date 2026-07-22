import { describe, expect, it } from "vitest";

import { parsePartnerInvoiceListFilters } from "@/lib/partner/queries/invoices";

describe("parsePartnerInvoiceListFilters", () => {
  it("defaults to uploaded desc with all payment statuses", () => {
    const result = parsePartnerInvoiceListFilters(new URLSearchParams());

    expect(result).toEqual({
      year: undefined,
      month: undefined,
      statusCode: undefined,
      paymentStatus: "all",
      sortBy: "uploaded",
      sortDir: "desc",
      page: 1,
    });
  });

  it("parses invoice filters", () => {
    const result = parsePartnerInvoiceListFilters(
      new URLSearchParams({
        year: "2026",
        month: "7",
        status: "SENT",
        paymentStatus: "pending",
        sortBy: "period",
        sortDir: "asc",
        page: "2",
      }),
    );

    expect(result).toEqual({
      year: 2026,
      month: 7,
      statusCode: "SENT",
      paymentStatus: "pending",
      sortBy: "period",
      sortDir: "asc",
      page: 2,
    });
  });

  it("ignores invalid values", () => {
    const result = parsePartnerInvoiceListFilters(
      new URLSearchParams({
        year: "abc",
        month: "99",
        page: "0",
      }),
    );

    expect(result.year).toBeUndefined();
    expect(result.month).toBeUndefined();
    expect(result.page).toBe(1);
  });

  it("ignores removed opco sort field", () => {
    const result = parsePartnerInvoiceListFilters(
      new URLSearchParams({ sortBy: "opco", sortDir: "asc" }),
    );

    expect(result.sortBy).toBe("uploaded");
    expect(result.sortDir).toBe("asc");
  });
});

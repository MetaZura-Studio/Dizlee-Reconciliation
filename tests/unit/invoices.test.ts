import { describe, expect, it } from "vitest";

import { shouldAutoAcknowledgeOpcoInvoice } from "@/lib/opco/invoices/acknowledgement";
import { parseOpcoInvoiceListFilters } from "@/lib/opco/queries/invoices";

describe("parseOpcoInvoiceListFilters", () => {
  it("defaults to uploaded desc with all payment statuses", () => {
    const result = parseOpcoInvoiceListFilters(new URLSearchParams());

    expect(result).toEqual({
      year: undefined,
      month: undefined,
      partnerId: undefined,
      statusCode: undefined,
      paymentStatus: "all",
      sortBy: "uploaded",
      sortDir: "desc",
      page: 1,
    });
  });

  it("parses invoice filters", () => {
    const result = parseOpcoInvoiceListFilters(
      new URLSearchParams({
        year: "2026",
        month: "7",
        partnerId: "3",
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
      partnerId: "3",
      statusCode: "SENT",
      paymentStatus: "pending",
      sortBy: "period",
      sortDir: "asc",
      page: 2,
    });
  });
});

describe("shouldAutoAcknowledgeOpcoInvoice", () => {
  it("acks only sent dizlee to opco invoices", () => {
    expect(shouldAutoAcknowledgeOpcoInvoice("CLIENT_TO_OPCO", "SENT")).toBe(true);
    expect(shouldAutoAcknowledgeOpcoInvoice("CLIENT_TO_OPCO", "ACKNOWLEDGED")).toBe(
      false,
    );
    expect(shouldAutoAcknowledgeOpcoInvoice("PARTNER_TO_CLIENT", "SENT")).toBe(false);
  });
});

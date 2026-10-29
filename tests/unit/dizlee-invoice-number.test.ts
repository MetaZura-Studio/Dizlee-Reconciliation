import { describe, expect, it } from "vitest";

import {
  DIZLEE_INVOICE_NUMBER_MAX_LEN,
  formatDizleeOpcoInvoiceNumber,
  formatInvoicePeriodToken,
  parseDizleeOpcoInvoiceSequence,
} from "@/lib/dizlee/invoice-number";

describe("dizlee OpCo invoice numbering", () => {
  it("formats period token as MonYY", () => {
    expect(formatInvoicePeriodToken(10, 2026)).toBe("Oct26");
    expect(formatInvoicePeriodToken(1, 2000)).toBe("Jan00");
  });

  it("matches client example API-81-Oct26-Zain Kuwait", () => {
    expect(
      formatDizleeOpcoInvoiceNumber({
        sequence: 81,
        month: 10,
        year: 2026,
        opcoName: "Zain Kuwait",
      }),
    ).toBe("API-81-Oct26-Zain Kuwait");
  });

  it("parses sequence from API- numbers", () => {
    expect(parseDizleeOpcoInvoiceSequence("API-81-Oct26-Zain Kuwait")).toBe(81);
    expect(parseDizleeOpcoInvoiceSequence("INV-202610-1-123")).toBeNull();
  });

  it("truncates long OpCo names to VARCHAR(64)", () => {
    const longName = "Zain ".repeat(30).trim();
    const number = formatDizleeOpcoInvoiceNumber({
      sequence: 1200,
      month: 10,
      year: 2026,
      opcoName: longName,
    });
    expect(number.length).toBeLessThanOrEqual(DIZLEE_INVOICE_NUMBER_MAX_LEN);
    expect(number.startsWith("API-1200-Oct26-")).toBe(true);
  });
});

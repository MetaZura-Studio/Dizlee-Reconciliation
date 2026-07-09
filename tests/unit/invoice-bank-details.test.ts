import { describe, expect, it } from "vitest";

import { updateInvoiceBankDetailsSchema } from "@/lib/admin/validation/invoice-bank-details";

describe("invoice bank details validation", () => {
  it("accepts optional fields and trims blanks to null", () => {
    const result = updateInvoiceBankDetailsSchema.safeParse({
      bankName: "  Dizlee Bank  ",
      accountName: "",
      accountNumber: null,
      iban: "JO00TEST",
      swift: "TESTJOAM",
      reference: "  INV-001  ",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        bankName: "Dizlee Bank",
        accountName: null,
        accountNumber: null,
        iban: "JO00TEST",
        swift: "TESTJOAM",
        reference: "INV-001",
      });
    }
  });

  it("rejects values that are too long", () => {
    const result = updateInvoiceBankDetailsSchema.safeParse({
      bankName: "x".repeat(256),
      accountName: null,
      accountNumber: null,
      iban: null,
      swift: null,
      reference: null,
    });

    expect(result.success).toBe(false);
  });
});

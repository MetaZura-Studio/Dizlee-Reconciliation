import { describe, expect, it } from "vitest";

import { updateInvoiceBankDetailsSchema } from "@/lib/admin/validation/invoice-bank-details";
import {
  findBankAccountById,
  parseInvoiceBankAccountsJson,
  parseInvoiceBankDetailsJson,
} from "@/lib/dizlee/invoice-bank-details";

describe("invoice bank details validation", () => {
  it("accepts multiple accounts", () => {
    const result = updateInvoiceBankDetailsSchema.safeParse({
      accounts: [
        {
          label: "Primary",
          bankName: "  Dizlee Bank  ",
          accountName: "",
          iban: "JO00TEST",
          swift: "TESTJOAM",
          reference: "  INV-001  ",
        },
        {
          id: "secondary",
          label: "EUR account",
          bankName: "Euro Bank",
          iban: "DE00TEST",
        },
      ],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.accounts).toHaveLength(2);
      expect(result.data.accounts[0].bankName).toBe("Dizlee Bank");
      expect(result.data.accounts[0].accountName).toBeNull();
    }
  });

  it("rejects an account with no bank fields", () => {
    const result = updateInvoiceBankDetailsSchema.safeParse({
      accounts: [{ label: "Empty", bankName: "", iban: null }],
    });

    expect(result.success).toBe(false);
  });
});

describe("invoice bank details parsing", () => {
  it("parses legacy single-object JSON as one account", () => {
    const accounts = parseInvoiceBankAccountsJson(
      JSON.stringify({
        bankName: "Legacy Bank",
        iban: "JO00LEGACY",
      }),
    );

    expect(accounts).toHaveLength(1);
    expect(accounts[0].label).toBe("Legacy Bank");
    expect(parseInvoiceBankDetailsJson(JSON.stringify(accounts[0]))).toMatchObject({
      bankName: "Legacy Bank",
      iban: "JO00LEGACY",
    });
  });

  it("parses accounts array format", () => {
    const accounts = parseInvoiceBankAccountsJson(
      JSON.stringify({
        accounts: [
          { id: "a1", label: "One", bankName: "Bank A", iban: "AA" },
          { id: "a2", label: "Two", bankName: "Bank B", iban: "BB" },
        ],
      }),
    );

    expect(accounts).toHaveLength(2);
    expect(findBankAccountById(accounts, undefined)?.id).toBeUndefined();
    expect(findBankAccountById(accounts, "a2")?.label).toBe("Two");
    expect(findBankAccountById([accounts[0]], "ignored")?.id).toBe("a1");
  });
});

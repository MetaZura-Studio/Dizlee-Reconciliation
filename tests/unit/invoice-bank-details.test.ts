import { describe, expect, it } from "vitest";

import { updateInvoiceBankDetailsSchema } from "@/lib/admin/validation/invoice-bank-details";
import {
  ensureDefaultBankAccount,
  findBankAccountById,
  getDefaultBankAccount,
  parseInvoiceBankAccountsJson,
  parseInvoiceBankDetailsJson,
} from "@/lib/dizlee/invoice-bank-details";

describe("invoice bank details validation", () => {
  it("accepts multiple accounts", () => {
    const result = updateInvoiceBankDetailsSchema.safeParse({
      accounts: [
        {
          label: "Primary",
          isDefault: true,
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
      expect(result.data.accounts[0].isDefault).toBe(true);
    }
  });

  it("rejects an account with no bank fields", () => {
    const result = updateInvoiceBankDetailsSchema.safeParse({
      accounts: [{ label: "Empty", bankName: "", iban: null }],
    });

    expect(result.success).toBe(false);
  });

  it("rejects more than one default", () => {
    const result = updateInvoiceBankDetailsSchema.safeParse({
      accounts: [
        { label: "A", isDefault: true, bankName: "Bank A" },
        { label: "B", isDefault: true, bankName: "Bank B" },
      ],
    });
    expect(result.success).toBe(false);
  });
});

describe("invoice bank details parsing", () => {
  it("parses legacy single-object JSON as one default account", () => {
    const accounts = parseInvoiceBankAccountsJson(
      JSON.stringify({
        bankName: "Legacy Bank",
        iban: "JO00LEGACY",
      }),
    );

    expect(accounts).toHaveLength(1);
    expect(accounts[0].label).toBe("Legacy Bank");
    expect(accounts[0].isDefault).toBe(true);
    expect(parseInvoiceBankDetailsJson(JSON.stringify(accounts[0]))).toMatchObject({
      bankName: "Legacy Bank",
      iban: "JO00LEGACY",
    });
  });

  it("parses accounts array and prefers isDefault", () => {
    const accounts = parseInvoiceBankAccountsJson(
      JSON.stringify({
        accounts: [
          { id: "a1", label: "One", bankName: "Bank A", iban: "AA" },
          {
            id: "a2",
            label: "Two",
            bankName: "Bank B",
            iban: "BB",
            isDefault: true,
          },
        ],
      }),
    );

    expect(accounts).toHaveLength(2);
    expect(getDefaultBankAccount(accounts)?.id).toBe("a2");
    expect(findBankAccountById(accounts, undefined)?.id).toBe("a2");
    expect(findBankAccountById(accounts, "a1")?.label).toBe("One");
    expect(findBankAccountById([accounts[0]], "ignored")?.id).toBe("a1");
  });

  it("makes the sole account default", () => {
    const normalized = ensureDefaultBankAccount([
      {
        id: "only",
        label: "Only",
        isDefault: false,
        bankName: "Bank",
        accountName: null,
        accountNumber: null,
        iban: null,
        swift: null,
        reference: null,
      },
    ]);
    expect(normalized[0].isDefault).toBe(true);
  });
});

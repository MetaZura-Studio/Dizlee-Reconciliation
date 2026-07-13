import type { InvoiceBankAccount } from "@/lib/dizlee/invoice-bank-details";

export type InvoiceBankAccountView = InvoiceBankAccount;

export type InvoiceBankDetailsListView = {
  accounts: InvoiceBankAccountView[];
};

/** @deprecated Prefer InvoiceBankAccountView / list view */
export type InvoiceBankDetailsView = {
  bankName: string | null;
  accountName: string | null;
  accountNumber: string | null;
  iban: string | null;
  swift: string | null;
  reference: string | null;
};

export const EMPTY_INVOICE_BANK_DETAILS: InvoiceBankDetailsView = {
  bankName: null,
  accountName: null,
  accountNumber: null,
  iban: null,
  swift: null,
  reference: null,
};

/**
 * Invoice bank account and signatory snapshots for digital Dizlee→OpCo invoices.
 * Consumed by invoice send flows and admin bank settings readers.
 * JSON on invoices supports legacy single-object, `{ accounts: [] }`, and raw array shapes.
 */

import { prisma } from "@/lib/prisma";

export type InvoiceBankDetails = {
  bankName: string | null;
  accountName: string | null;
  accountNumber: string | null;
  iban: string | null;
  swift: string | null;
  reference: string | null;
};

export type InvoiceBankAccount = InvoiceBankDetails & {
  id: string;
  label: string;
  isDefault: boolean;
};

function readString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function readBoolean(value: unknown): boolean {
  return value === true || value === "true" || value === 1 || value === "1";
}

function hasAnyField(details: InvoiceBankDetails): boolean {
  return Boolean(
    details.bankName ||
      details.accountName ||
      details.accountNumber ||
      details.iban ||
      details.swift ||
      details.reference,
  );
}

function parseDetailsObject(parsed: Record<string, unknown>): InvoiceBankDetails {
  return {
    bankName: readString(parsed.bankName ?? parsed.bank_name),
    accountName: readString(parsed.accountName ?? parsed.account_name),
    accountNumber: readString(parsed.accountNumber ?? parsed.account_number),
    iban: readString(parsed.iban),
    swift: readString(parsed.swift ?? parsed.swiftCode ?? parsed.swift_code),
    reference: readString(parsed.reference ?? parsed.paymentReference),
  };
}

function makeId(): string {
  return `bank_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Exactly one default when accounts exist; sole account is always default. */
export function ensureDefaultBankAccount(
  accounts: InvoiceBankAccount[],
): InvoiceBankAccount[] {
  if (accounts.length === 0) {
    return [];
  }
  if (accounts.length === 1) {
    return [{ ...accounts[0], isDefault: true }];
  }

  const preferredIndex = accounts.findIndex((account) => account.isDefault);
  const defaultIndex = preferredIndex >= 0 ? preferredIndex : 0;

  return accounts.map((account, index) => ({
    ...account,
    isDefault: index === defaultIndex,
  }));
}

export function getDefaultBankAccount(
  accounts: InvoiceBankAccount[],
): InvoiceBankAccount | null {
  const normalized = ensureDefaultBankAccount(accounts);
  return normalized.find((account) => account.isDefault) ?? normalized[0] ?? null;
}

export function parseInvoiceBankDetailsJson(
  raw: string | null | undefined,
): InvoiceBankDetails | null {
  const accounts = parseInvoiceBankAccountsJson(raw);
  const selected = getDefaultBankAccount(accounts);
  if (!selected) {
    return null;
  }
  return {
    bankName: selected.bankName,
    accountName: selected.accountName,
    accountNumber: selected.accountNumber,
    iban: selected.iban,
    swift: selected.swift,
    reference: selected.reference,
  };
}

/**
 * Supports:
 * - legacy single object `{ bankName, ... }`
 * - new `{ accounts: [...] }`
 * - raw array `[...]`
 */
export function parseInvoiceBankAccountsJson(
  raw: string | null | undefined,
): InvoiceBankAccount[] {
  if (!raw?.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    let accounts: InvoiceBankAccount[] = [];

    if (Array.isArray(parsed)) {
      accounts = parsed
        .map((item, index) => normalizeAccount(item, index))
        .filter((account): account is InvoiceBankAccount => account !== null);
    } else if (parsed && typeof parsed === "object") {
      const record = parsed as Record<string, unknown>;
      if (Array.isArray(record.accounts)) {
        accounts = record.accounts
          .map((item, index) => normalizeAccount(item, index))
          .filter((account): account is InvoiceBankAccount => account !== null);
      } else {
        const legacy = parseDetailsObject(record);
        if (hasAnyField(legacy)) {
          accounts = [
            {
              id: "legacy",
              label: legacy.bankName ?? "Default account",
              isDefault: true,
              ...legacy,
            },
          ];
        }
      }
    }

    return ensureDefaultBankAccount(accounts);
  } catch {
    return [];
  }
}

function normalizeAccount(
  value: unknown,
  index: number,
): InvoiceBankAccount | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const record = value as Record<string, unknown>;
  const details = parseDetailsObject(record);
  if (!hasAnyField(details)) {
    return null;
  }

  const id = readString(record.id) ?? `account-${index + 1}`;
  const label =
    readString(record.label) ??
    details.bankName ??
    details.accountName ??
    `Account ${index + 1}`;

  return {
    id,
    label,
    isDefault: readBoolean(record.isDefault ?? record.is_default),
    ...details,
  };
}

export function serializeInvoiceBankAccounts(
  accounts: InvoiceBankAccount[],
): string | null {
  const normalized = ensureDefaultBankAccount(accounts);
  if (normalized.length === 0) {
    return null;
  }

  return JSON.stringify({
    accounts: normalized.map((account) => ({
      id: account.id || makeId(),
      label: account.label,
      isDefault: account.isDefault,
      bankName: account.bankName,
      accountName: account.accountName,
      accountNumber: account.accountNumber,
      iban: account.iban,
      swift: account.swift,
      reference: account.reference,
    })),
  });
}

export type InvoiceSignatories = {
  preparedBy: string | null;
  approvedBy: string | null;
};

export function parseInvoiceSignatoriesJson(
  raw: string | null | undefined,
): InvoiceSignatories {
  if (!raw?.trim()) {
    return { preparedBy: null, approvedBy: null };
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { preparedBy: null, approvedBy: null };
    }
    const record = parsed as Record<string, unknown>;
    return {
      preparedBy: readString(record.preparedBy ?? record.prepared_by),
      approvedBy: readString(record.approvedBy ?? record.approved_by),
    };
  } catch {
    return { preparedBy: null, approvedBy: null };
  }
}

/** JSON snapshot stored on sent invoices: selected account plus optional signatories. */
export function serializeInvoiceBankDetailsSnapshot(
  account: InvoiceBankAccount | InvoiceBankDetails,
  signatories?: Partial<InvoiceSignatories> | null,
): string {
  return JSON.stringify({
    label: "label" in account ? account.label : null,
    bankName: account.bankName,
    accountName: account.accountName,
    accountNumber: account.accountNumber,
    iban: account.iban,
    swift: account.swift,
    reference: account.reference,
    preparedBy: readString(signatories?.preparedBy) ?? null,
    approvedBy: readString(signatories?.approvedBy) ?? null,
  });
}

export async function getInvoiceBankAccounts(): Promise<InvoiceBankAccount[]> {
  const settings = await prisma.appSettings.findFirst({
    where: { id: 1 },
    select: { opcoInvoiceBankDetailsJson: true },
  });

  return parseInvoiceBankAccountsJson(settings?.opcoInvoiceBankDetailsJson);
}

export async function getInvoiceBankDetails(): Promise<InvoiceBankDetails | null> {
  const accounts = await getInvoiceBankAccounts();
  const selected = getDefaultBankAccount(accounts);
  if (!selected) {
    return null;
  }
  return {
    bankName: selected.bankName,
    accountName: selected.accountName,
    accountNumber: selected.accountNumber,
    iban: selected.iban,
    swift: selected.swift,
    reference: selected.reference,
  };
}

export function findBankAccountById(
  accounts: InvoiceBankAccount[],
  bankAccountId: string | null | undefined,
): InvoiceBankAccount | null {
  if (accounts.length === 0) {
    return null;
  }
  if (accounts.length === 1) {
    return ensureDefaultBankAccount(accounts)[0];
  }
  if (!bankAccountId) {
    return getDefaultBankAccount(accounts);
  }
  return accounts.find((account) => account.id === bankAccountId) ?? null;
}

export { makeId as createBankAccountId };

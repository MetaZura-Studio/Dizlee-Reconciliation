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
};

function readString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
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

export function parseInvoiceBankDetailsJson(
  raw: string | null | undefined,
): InvoiceBankDetails | null {
  const accounts = parseInvoiceBankAccountsJson(raw);
  if (accounts.length === 0) {
    return null;
  }
  const first = accounts[0];
  return {
    bankName: first.bankName,
    accountName: first.accountName,
    accountNumber: first.accountNumber,
    iban: first.iban,
    swift: first.swift,
    reference: first.reference,
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

    if (Array.isArray(parsed)) {
      return parsed
        .map((item, index) => normalizeAccount(item, index))
        .filter((account): account is InvoiceBankAccount => account !== null);
    }

    if (!parsed || typeof parsed !== "object") {
      return [];
    }

    const record = parsed as Record<string, unknown>;
    if (Array.isArray(record.accounts)) {
      return record.accounts
        .map((item, index) => normalizeAccount(item, index))
        .filter((account): account is InvoiceBankAccount => account !== null);
    }

    const legacy = parseDetailsObject(record);
    if (!hasAnyField(legacy)) {
      return [];
    }

    return [
      {
        id: "legacy",
        label: legacy.bankName ?? "Default account",
        ...legacy,
      },
    ];
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
    ...details,
  };
}

export function serializeInvoiceBankAccounts(
  accounts: InvoiceBankAccount[],
): string | null {
  if (accounts.length === 0) {
    return null;
  }

  return JSON.stringify({
    accounts: accounts.map((account) => ({
      id: account.id || makeId(),
      label: account.label,
      bankName: account.bankName,
      accountName: account.accountName,
      accountNumber: account.accountNumber,
      iban: account.iban,
      swift: account.swift,
      reference: account.reference,
    })),
  });
}

export function serializeInvoiceBankDetailsSnapshot(
  account: InvoiceBankAccount | InvoiceBankDetails,
): string {
  return JSON.stringify({
    label: "label" in account ? account.label : null,
    bankName: account.bankName,
    accountName: account.accountName,
    accountNumber: account.accountNumber,
    iban: account.iban,
    swift: account.swift,
    reference: account.reference,
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
  if (accounts.length === 0) {
    return null;
  }
  const first = accounts[0];
  return {
    bankName: first.bankName,
    accountName: first.accountName,
    accountNumber: first.accountNumber,
    iban: first.iban,
    swift: first.swift,
    reference: first.reference,
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
    return accounts[0];
  }
  if (!bankAccountId) {
    return null;
  }
  return accounts.find((account) => account.id === bankAccountId) ?? null;
}

export { makeId as createBankAccountId };

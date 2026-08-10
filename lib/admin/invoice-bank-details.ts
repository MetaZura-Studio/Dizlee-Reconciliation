/**
 * Admin OpCo invoice bank accounts — JSON snapshot on app_settings for digital Dizlee invoices.
 * Uses shared parse/serialize helpers from dizlee invoice bank module.
 */
import { writeSettingsAuditLog } from "@/lib/admin/audit";
import type { InvoiceBankDetailsListView } from "@/lib/admin/invoice-bank-details.shared";
import {
  updateInvoiceBankDetailsSchema,
  type UpdateInvoiceBankDetailsInput,
} from "@/lib/admin/validation/invoice-bank-details";
import {
  createBankAccountId,
  parseInvoiceBankAccountsJson,
  serializeInvoiceBankAccounts,
  type InvoiceBankAccount,
} from "@/lib/dizlee/invoice-bank-details";
import { prisma } from "@/lib/prisma";
import { DomainError } from "@/lib/errors/app-error";

export type { InvoiceBankDetailsListView } from "@/lib/admin/invoice-bank-details.shared";

export class InvoiceBankDetailsError extends DomainError {
  constructor(keyOrMessage: string, status?: number) {
    super("InvoiceBankDetailsError", keyOrMessage, status);
  }
}

function toListView(accounts: InvoiceBankAccount[]): InvoiceBankDetailsListView {
  return { accounts };
}

export async function getInvoiceBankDetailsView(): Promise<InvoiceBankDetailsListView> {
  const settings = await prisma.appSettings.findFirst({
    where: { id: 1 },
    select: { opcoInvoiceBankDetailsJson: true },
  });

  if (!settings) {
    throw new InvoiceBankDetailsError(
      "Application settings could not be loaded.",
      500,
    );
  }

  return toListView(
    parseInvoiceBankAccountsJson(settings.opcoInvoiceBankDetailsJson),
  );
}

export async function updateInvoiceBankDetails(
  rawInput: UpdateInvoiceBankDetailsInput,
  actorUserId: bigint,
): Promise<InvoiceBankDetailsListView> {
  const parsed = updateInvoiceBankDetailsSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new InvoiceBankDetailsError(
      parsed.error.issues[0]?.message ?? "Invalid input",
    );
  }

  const accounts: InvoiceBankAccount[] = parsed.data.accounts.map((account) => ({
    id: account.id?.trim() || createBankAccountId(),
    label: account.label.trim(),
    bankName: account.bankName,
    accountName: account.accountName,
    accountNumber: account.accountNumber,
    iban: account.iban,
    swift: account.swift,
    reference: account.reference,
  }));

  const opcoInvoiceBankDetailsJson = serializeInvoiceBankAccounts(accounts);

  await prisma.appSettings.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      opcoInvoiceBankDetailsJson,
    },
    update: {
      opcoInvoiceBankDetailsJson,
    },
  });

  await writeSettingsAuditLog({
    actorUserId,
    action: "SETTINGS_BANK_DETAILS_UPDATED",
    message: "Invoice bank details updated.",
    metadata: { accountCount: accounts.length, accounts },
  });

  return toListView(accounts);
}

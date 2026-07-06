import { prisma } from "@/lib/prisma";

export type InvoiceBankDetails = {
  bankName: string | null;
  accountName: string | null;
  accountNumber: string | null;
  iban: string | null;
  swift: string | null;
  reference: string | null;
};

function readString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function parseInvoiceBankDetailsJson(
  raw: string | null | undefined,
): InvoiceBankDetails | null {
  if (!raw?.trim()) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const details: InvoiceBankDetails = {
      bankName: readString(parsed.bankName ?? parsed.bank_name),
      accountName: readString(parsed.accountName ?? parsed.account_name),
      accountNumber: readString(parsed.accountNumber ?? parsed.account_number),
      iban: readString(parsed.iban),
      swift: readString(parsed.swift ?? parsed.swiftCode ?? parsed.swift_code),
      reference: readString(parsed.reference ?? parsed.paymentReference),
    };

    if (
      !details.bankName &&
      !details.accountName &&
      !details.accountNumber &&
      !details.iban &&
      !details.swift &&
      !details.reference
    ) {
      return null;
    }

    return details;
  } catch {
    return null;
  }
}

export async function getInvoiceBankDetails(): Promise<InvoiceBankDetails | null> {
  const settings = await prisma.appSettings.findFirst({
    where: { id: 1 },
    select: { opcoInvoiceBankDetailsJson: true },
  });

  return parseInvoiceBankDetailsJson(settings?.opcoInvoiceBankDetailsJson);
}

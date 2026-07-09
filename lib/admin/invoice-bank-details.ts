import { writeSettingsAuditLog } from "@/lib/admin/audit";
import {
  EMPTY_INVOICE_BANK_DETAILS,
  type InvoiceBankDetailsView,
} from "@/lib/admin/invoice-bank-details.shared";
import {
  updateInvoiceBankDetailsSchema,
  type UpdateInvoiceBankDetailsInput,
} from "@/lib/admin/validation/invoice-bank-details";
import { parseInvoiceBankDetailsJson } from "@/lib/dizlee/invoice-bank-details";
import { prisma } from "@/lib/prisma";

export type { InvoiceBankDetailsView } from "@/lib/admin/invoice-bank-details.shared";

export class InvoiceBankDetailsError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "InvoiceBankDetailsError";
    this.status = status;
  }
}

function serializeBankDetailsJson(
  input: UpdateInvoiceBankDetailsInput,
): string | null {
  const details = {
    bankName: input.bankName,
    accountName: input.accountName,
    accountNumber: input.accountNumber,
    iban: input.iban,
    swift: input.swift,
    reference: input.reference,
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

  return JSON.stringify(details);
}

function toView(parsed: ReturnType<typeof parseInvoiceBankDetailsJson>): InvoiceBankDetailsView {
  if (!parsed) {
    return { ...EMPTY_INVOICE_BANK_DETAILS };
  }

  return { ...parsed };
}

export async function getInvoiceBankDetailsView(): Promise<InvoiceBankDetailsView> {
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

  return toView(parseInvoiceBankDetailsJson(settings.opcoInvoiceBankDetailsJson));
}

export async function updateInvoiceBankDetails(
  rawInput: UpdateInvoiceBankDetailsInput,
  actorUserId: bigint,
): Promise<InvoiceBankDetailsView> {
  const parsed = updateInvoiceBankDetailsSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new InvoiceBankDetailsError(
      parsed.error.issues[0]?.message ?? "Invalid input",
    );
  }

  const opcoInvoiceBankDetailsJson = serializeBankDetailsJson(parsed.data);

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
    metadata: parsed.data,
  });

  return toView(parseInvoiceBankDetailsJson(opcoInvoiceBankDetailsJson));
}

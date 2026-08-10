/**
 * Partner PDF invoice upload for PARTNER_TO_DIZLEE billing periods.
 *
 * Portal: Partner. Enforces one invoice per partner/period; persists file, draft/sent
 * workflow, audit log, and Dizlee notification. Currency defaults from platform base.
 */

import { getPartnerLookupId } from "@/lib/partner/lookups";
import { formatPeriodLabel } from "@/lib/partner/period";
import { saveInvoiceFileLocally } from "@/lib/partner/storage/save-invoice-file";
import type { PartnerInvoiceUploadMetadata } from "@/lib/partner/validation/invoice-upload";
import { writePlatformAuditLog } from "@/lib/platform/audit-log";
import { BASE_CURRENCY_ISO_CODE } from "@/lib/platform/currency-rates";
import { notifyDizleeUsers } from "@/lib/platform/notify-dizlee";
import prisma from "@/lib/prisma";
import { DomainError } from "@/lib/errors/app-error";

export class InvoiceUploadError extends DomainError {
  constructor(keyOrMessage: string, status?: number) {
    super("InvoiceUploadError", keyOrMessage, status);
  }
}

type CreatePartnerInvoiceInput = {
  partnerId: bigint;
  userId: bigint;
  metadata: PartnerInvoiceUploadMetadata;
  filename: string;
  mimeType: string;
  buffer: Buffer;
};

function buildInvoiceNumber(
  partnerId: bigint,
  month: number,
  year: number,
): string {
  return `PINV-${year}${String(month).padStart(2, "0")}-${partnerId.toString()}-${Date.now()}`;
}

export async function createPartnerInvoice(
  input: CreatePartnerInvoiceInput,
): Promise<{ invoiceId: string }> {
  const [
    partner,
    baseCurrency,
    invoiceTypeId,
    sentStatusId,
    unpaidStatusId,
    actionId,
  ] = await Promise.all([
    prisma.partner.findFirst({
      where: { id: input.partnerId },
      select: { name: true },
    }),
    prisma.currency.findFirst({
      where: { isoCode: BASE_CURRENCY_ISO_CODE, isDeleted: false },
      select: { id: true },
    }),
    getPartnerLookupId("INVOICE_TYPE", "PARTNER_TO_CLIENT"),
    getPartnerLookupId("INVOICE_STATUS", "SENT"),
    getPartnerLookupId("PAYMENT_STATUS", "UNPAID"),
    getPartnerLookupId("AUDIT_ACTION", "INVOICE_STATUS_UPDATED"),
  ]);

  if (!partner) {
    throw new InvoiceUploadError("Partner not found", 404);
  }

  if (!baseCurrency) {
    throw new InvoiceUploadError(
      `${BASE_CURRENCY_ISO_CODE} currency is not configured`,
      500,
    );
  }

  const duplicate = await prisma.invoice.findFirst({
    where: {
      partnerId: input.partnerId,
      month: input.metadata.month,
      year: input.metadata.year,
      invoiceTypeId,
      isDeleted: false,
    },
    select: { id: true },
  });

  if (duplicate) {
    throw new InvoiceUploadError(
      "An invoice already exists for this period",
      409,
    );
  }

  if (input.metadata.invoiceNumber) {
    const duplicateNumber = await prisma.invoice.findFirst({
      where: { invoiceNumber: input.metadata.invoiceNumber },
      select: { id: true },
    });

    if (duplicateNumber) {
      throw new InvoiceUploadError("Invoice number is already in use", 409);
    }
  }

  const savedFile = await saveInvoiceFileLocally({
    buffer: input.buffer,
    filename: input.filename,
    mimeType: input.mimeType,
  });

  const now = new Date();
  const invoiceNumber =
    input.metadata.invoiceNumber?.trim() ||
    buildInvoiceNumber(
      input.partnerId,
      input.metadata.month,
      input.metadata.year,
    );

  const file = await prisma.file.create({
    data: {
      filename: input.filename,
      storageKey: savedFile.storageKey,
      mimeType: input.mimeType,
      sizeBytes: savedFile.sizeBytes,
      checksum: savedFile.checksum,
      uploadedByUserId: input.userId,
    },
  });

  const invoice = await prisma.invoice.create({
    data: {
      invoiceNumber,
      month: input.metadata.month,
      year: input.metadata.year,
      opcoId: null,
      partnerId: input.partnerId,
      invoiceTypeId,
      fileId: file.id,
      currencyId: baseCurrency.id,
      invoiceStatusId: sentStatusId,
      paymentStatusId: unpaidStatusId,
      sentAt: now,
      createdByUserId: input.userId,
      uploadedByUserId: input.userId,
      updatedByUserId: input.userId,
    },
    select: { id: true },
  });

  await prisma.invoiceActivityLog.create({
    data: {
      invoiceId: invoice.id,
      actorUserId: input.userId,
      actionId,
      statusField: "invoice_status",
      previousStatus: "DRAFT",
      newStatus: "SENT",
    },
  });

  await writePlatformAuditLog({
    actorUserId: input.userId,
    action: "INVOICE_STATUS_UPDATED",
    entityType: "INVOICE",
    entityId: invoice.id,
    message: `Partner submitted invoice ${invoiceNumber} to Dizlee (${input.metadata.year}-${String(input.metadata.month).padStart(2, "0")})`,
    metadata: {
      partnerId: input.partnerId.toString(),
      month: input.metadata.month,
      year: input.metadata.year,
    },
  });

  const periodLabel = formatPeriodLabel(
    input.metadata.year,
    input.metadata.month,
  );
  await notifyDizleeUsers({
    fromUserId: input.userId,
    subject: "Partner invoice uploaded",
    body: `${partner.name} uploaded invoice ${invoiceNumber} for ${periodLabel}.`,
  });

  return { invoiceId: invoice.id.toString() };
}

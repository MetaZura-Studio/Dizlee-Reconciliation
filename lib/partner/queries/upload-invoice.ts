import { getPartnerLookupId } from "@/lib/partner/lookups";
import { formatPeriodLabel } from "@/lib/partner/period";
import { isOpcoLinkedToPartner } from "@/lib/partner/queries/opcos";
import { saveInvoiceFileLocally } from "@/lib/partner/storage/save-invoice-file";
import type { PartnerInvoiceUploadMetadata } from "@/lib/partner/validation/invoice-upload";
import { writePlatformAuditLog } from "@/lib/platform/audit-log";
import { notifyDizleeUsers } from "@/lib/platform/notify-dizlee";
import prisma from "@/lib/prisma";

export class InvoiceUploadError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "InvoiceUploadError";
    this.status = status;
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

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function buildInvoiceNumber(
  partnerId: bigint,
  opcoId: bigint,
  month: number,
  year: number,
): string {
  return `PINV-${year}${String(month).padStart(2, "0")}-${partnerId.toString()}-${opcoId.toString()}-${Date.now()}`;
}

export async function createPartnerInvoice(
  input: CreatePartnerInvoiceInput,
): Promise<{ invoiceId: string }> {
  const linked = await isOpcoLinkedToPartner(
    input.partnerId,
    BigInt(input.metadata.opcoId),
  );

  if (!linked) {
    throw new InvoiceUploadError("OpCo is not linked to this partner", 403);
  }

  const opcoId = BigInt(input.metadata.opcoId);

  const [opco, partner, invoiceTypeId, sentStatusId, unpaidStatusId, actionId] =
    await Promise.all([
      prisma.opco.findFirst({
        where: { id: opcoId },
        select: { defaultCurrencyId: true, name: true },
      }),
      prisma.partner.findFirst({
        where: { id: input.partnerId },
        select: { name: true },
      }),
      getPartnerLookupId("INVOICE_TYPE", "PARTNER_TO_CLIENT"),
      getPartnerLookupId("INVOICE_STATUS", "SENT"),
      getPartnerLookupId("PAYMENT_STATUS", "UNPAID"),
      getPartnerLookupId("AUDIT_ACTION", "INVOICE_STATUS_UPDATED"),
    ]);

  if (!opco) {
    throw new InvoiceUploadError("OpCo not found", 404);
  }

  if (!partner) {
    throw new InvoiceUploadError("Partner not found", 404);
  }

  const duplicate = await prisma.invoice.findFirst({
    where: {
      opcoId,
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
      "An invoice already exists for this OpCo and period",
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
      opcoId,
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
      opcoId,
      partnerId: input.partnerId,
      invoiceTypeId,
      fileId: file.id,
      currencyId: opco.defaultCurrencyId,
      invoiceStatusId: sentStatusId,
      paymentStatusId: unpaidStatusId,
      sentAt: now,
      createdByUserId: input.userId,
      uploadedByUserId: input.userId,
      updatedByUserId: input.userId,
      items: {
        create: input.metadata.lineItems.map((item, index) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineTotal: roundMoney(item.quantity * item.unitPrice),
          sortOrder: index,
          createdByUserId: input.userId,
          updatedByUserId: input.userId,
        })),
      },
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
      opcoId: opcoId.toString(),
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
    body: `${partner.name} uploaded invoice ${invoiceNumber} for ${opco.name} (${periodLabel}).`,
  });

  return { invoiceId: invoice.id.toString() };
}

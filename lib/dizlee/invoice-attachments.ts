/**
 * Dizlee → OpCo invoice supporting attachments (any format, 20 MB each, max 5).
 */
import "server-only";

import { DomainError } from "@/lib/errors/app-error";
import {
  MAX_INVOICE_ATTACHMENTS,
  validateInvoiceAttachmentFileMeta,
  type InvoiceAttachmentView,
} from "@/lib/dizlee/invoice-attachments.shared";
import { saveStoredObject } from "@/lib/platform/storage/object-storage";
import { prisma } from "@/lib/prisma";

export {
  INVOICE_ATTACHMENT_ACCEPT,
  INVOICE_ATTACHMENT_TOO_LARGE_MESSAGE,
  MAX_INVOICE_ATTACHMENT_BYTES,
  MAX_INVOICE_ATTACHMENTS,
  type InvoiceAttachmentView,
} from "@/lib/dizlee/invoice-attachments.shared";

export class InvoiceAttachmentError extends DomainError {
  constructor(keyOrMessage: string, status?: number) {
    super("InvoiceAttachmentError", keyOrMessage, status);
  }
}

export function validateInvoiceAttachmentFile(
  file: File,
): { filename: string; mimeType: string } {
  try {
    return validateInvoiceAttachmentFileMeta({
      filename: file.name,
      size: file.size,
      clientMimeType: file.type,
    });
  } catch (error) {
    throw new InvoiceAttachmentError(
      error instanceof Error ? error.message : "Invalid attachment.",
    );
  }
}

export async function createInvoiceAttachmentFile(params: {
  buffer: Buffer;
  filename: string;
  mimeType: string;
  userId: bigint;
}): Promise<{
  fileId: string;
  filename: string;
  sizeBytes: number;
  mimeType: string;
}> {
  const saved = await saveStoredObject({
    folder: "invoices",
    buffer: params.buffer,
    filename: params.filename,
    mimeType: params.mimeType,
  });

  const file = await prisma.file.create({
    data: {
      filename: params.filename,
      storageKey: saved.storageKey,
      mimeType: params.mimeType,
      sizeBytes: saved.sizeBytes,
      checksum: saved.checksum,
      uploadedByUserId: params.userId,
      updatedByUserId: params.userId,
    },
    select: { id: true, filename: true, sizeBytes: true, mimeType: true },
  });

  return {
    fileId: file.id.toString(),
    filename: file.filename,
    sizeBytes: file.sizeBytes ? Number(file.sizeBytes) : params.buffer.length,
    mimeType: file.mimeType ?? params.mimeType,
  };
}

/** Pending uploads for create — must be actor-owned under invoices/. */
export async function resolveInvoiceAttachmentFiles(params: {
  attachmentFileIds: string[];
  userId: bigint;
}): Promise<
  Array<{
    fileId: bigint;
    filename: string;
    mimeType: string | null;
    storageKey: string;
  }>
> {
  const uniqueIds = [
    ...new Set(params.attachmentFileIds.map((id) => id.trim())),
  ].filter(Boolean);

  if (uniqueIds.length === 0) {
    return [];
  }

  if (uniqueIds.length > MAX_INVOICE_ATTACHMENTS) {
    throw new InvoiceAttachmentError(
      `At most ${MAX_INVOICE_ATTACHMENTS} attachments are allowed.`,
    );
  }

  const files = await prisma.file.findMany({
    where: {
      id: { in: uniqueIds.map((id) => BigInt(id)) },
      isDeleted: false,
      uploadedByUserId: params.userId,
      storageKey: { startsWith: "invoices/" },
    },
    select: {
      id: true,
      filename: true,
      mimeType: true,
      storageKey: true,
    },
  });

  if (files.length !== uniqueIds.length) {
    throw new InvoiceAttachmentError(
      "One or more attachments are invalid or no longer available.",
    );
  }

  const byId = new Map(files.map((file) => [file.id.toString(), file]));
  return uniqueIds.map((id) => {
    const file = byId.get(id)!;
    return {
      fileId: file.id,
      filename: file.filename,
      mimeType: file.mimeType,
      storageKey: file.storageKey,
    };
  });
}

export function mapInvoiceAttachmentViews(
  rows: Array<{
    id: bigint;
    fileId: bigint;
    file: { filename: string; sizeBytes: bigint | null };
  }>,
  downloadBasePath: string,
): InvoiceAttachmentView[] {
  return rows.map((row) => ({
    id: row.id.toString(),
    fileId: row.fileId.toString(),
    filename: row.file.filename,
    sizeBytes: row.file.sizeBytes ? Number(row.file.sizeBytes) : null,
    downloadUrl: `${downloadBasePath}/${row.id.toString()}`,
  }));
}

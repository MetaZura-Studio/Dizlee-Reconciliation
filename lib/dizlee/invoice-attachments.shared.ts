/**
 * Client-safe constants/helpers for Dizlee → OpCo invoice supporting attachments.
 * Any file format; size/count capped in app (no MIME allowlist).
 */

export const MAX_INVOICE_ATTACHMENTS = 5;

/** 20 MB per file. */
export const MAX_INVOICE_ATTACHMENT_BYTES = 20 * 1024 * 1024;

export const INVOICE_ATTACHMENT_ACCEPT = "*/*";

export const INVOICE_ATTACHMENT_TOO_LARGE_MESSAGE =
  "Each attachment must be 20 MB or smaller.";

export type InvoiceAttachmentView = {
  id: string;
  fileId: string;
  filename: string;
  sizeBytes: number | null;
  downloadUrl: string;
};

/** Pure client/server validation before upload (no Prisma). */
export function validateInvoiceAttachmentFileMeta(params: {
  filename: string;
  size: number;
  clientMimeType?: string | null;
}): { filename: string; mimeType: string } {
  const filename = params.filename.trim();
  if (!filename) {
    throw new Error("File name is required.");
  }
  if (params.size <= 0) {
    throw new Error("File is empty.");
  }
  if (params.size > MAX_INVOICE_ATTACHMENT_BYTES) {
    throw new Error(INVOICE_ATTACHMENT_TOO_LARGE_MESSAGE);
  }

  const clientMime = params.clientMimeType?.trim();
  const mimeType =
    clientMime && clientMime.length > 0
      ? clientMime.split(";")[0]!.trim()
      : "application/octet-stream";

  return { filename, mimeType };
}

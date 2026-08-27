/**
 * Partner PDF invoice upload validation: metadata schema and client file checks.
 *
 * Portal: Partner. Accepts `.pdf` only; period must not exceed current calendar month.
 */

import { z } from "zod";

import { getCurrentPeriod, isFuturePeriod } from "@/lib/platform/period";

export const MAX_INVOICE_UPLOAD_BYTES = 10 * 1024 * 1024;

export const ALLOWED_INVOICE_MIME_TYPES = ["application/pdf"] as const;

export const ALLOWED_INVOICE_EXTENSIONS = [".pdf"] as const;

export const partnerInvoiceUploadMetadataSchema = z
  .object({
    year: z.coerce.number().int().min(2000).max(2100),
    month: z.coerce.number().int().min(1).max(12),
    invoiceNumber: z.string().trim().max(64).optional(),
  })
  .superRefine((data, ctx) => {
    const current = getCurrentPeriod();
    if (data.year > current.year) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invoice year cannot be in the future",
        path: ["year"],
      });
      return;
    }
    if (isFuturePeriod(data.year, data.month)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invoice period cannot be in the future",
        path: ["month"],
      });
    }
  });

export type PartnerInvoiceUploadMetadata = z.infer<
  typeof partnerInvoiceUploadMetadataSchema
>;

export function validateInvoiceUploadFile(file: File | null): string | null {
  if (!file) {
    return "Invoice PDF is required";
  }

  const lowerName = file.name.toLowerCase();

  if (!ALLOWED_INVOICE_EXTENSIONS.some((ext) => lowerName.endsWith(ext))) {
    return "Only .pdf files are supported";
  }

  const clientMime = file.type?.trim().toLowerCase().split(";")[0]?.trim() ?? "";
  if (
    clientMime &&
    (clientMime.includes("html") ||
      clientMime.includes("svg") ||
      clientMime.includes("javascript") ||
      (!ALLOWED_INVOICE_MIME_TYPES.includes(
        clientMime as (typeof ALLOWED_INVOICE_MIME_TYPES)[number],
      ) &&
        clientMime !== "application/octet-stream"))
  ) {
    return "Invalid PDF file type";
  }

  if (file.size <= 0) {
    return "Uploaded file is empty";
  }

  if (file.size > MAX_INVOICE_UPLOAD_BYTES) {
    return "File exceeds the 10 MB upload limit";
  }

  return null;
}

/** PDF files start with the ASCII signature `%PDF-`. */
export function assertPdfBufferMagic(buffer: Buffer): string | null {
  if (buffer.length < 5) {
    return "Uploaded file is empty";
  }

  const signature = buffer.subarray(0, 5).toString("ascii");
  if (signature !== "%PDF-") {
    return "File content is not a valid PDF";
  }

  return null;
}

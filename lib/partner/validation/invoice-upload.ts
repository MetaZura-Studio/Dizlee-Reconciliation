import { z } from "zod";

import { getCurrentPeriod, isFuturePeriod } from "@/lib/platform/period";

export const MAX_INVOICE_UPLOAD_BYTES = 10 * 1024 * 1024;

export const ALLOWED_INVOICE_MIME_TYPES = ["application/pdf"] as const;

export const ALLOWED_INVOICE_EXTENSIONS = [".pdf"] as const;

export const invoiceUploadLineItemSchema = z.object({
  description: z.string().trim().min(1, "Description is required"),
  quantity: z.coerce.number().positive("Quantity must be greater than 0"),
  unitPrice: z.coerce.number().min(0, "Unit price must be 0 or greater"),
});

export const partnerInvoiceUploadMetadataSchema = z
  .object({
    opcoId: z.string().trim().min(1, "OpCo is required"),
    year: z.coerce.number().int().min(2000).max(2100),
    month: z.coerce.number().int().min(1).max(12),
    invoiceNumber: z.string().trim().max(64).optional(),
    lineItems: z
      .array(invoiceUploadLineItemSchema)
      .min(1, "At least one line item is required"),
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

  if (
    file.type &&
    !ALLOWED_INVOICE_MIME_TYPES.includes(
      file.type as (typeof ALLOWED_INVOICE_MIME_TYPES)[number],
    )
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

export function parseInvoiceLineItemsJson(value: string | null): unknown {
  if (!value) {
    return [];
  }

  return JSON.parse(value) as unknown;
}

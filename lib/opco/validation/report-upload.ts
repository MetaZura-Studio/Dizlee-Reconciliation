/**
 * OpCo report upload validation: metadata schema and client file checks.
 *
 * Portal: OpCo. Accepts `.xlsx` only; period must not exceed current calendar month.
 * partnerId is required for normal OpCos; optional when Service–Partner lookup mode is used.
 */

import { z } from "zod";

import {
  MAX_EXCEL_UPLOAD_BYTES,
  XLSX_EXTENSIONS,
  XLSX_MIME_TYPES,
  validateExcelUploadFile,
} from "@/lib/platform/excel-upload";
import { getCurrentPeriod, isFuturePeriod } from "@/lib/platform/period";

export const MAX_REPORT_UPLOAD_BYTES = MAX_EXCEL_UPLOAD_BYTES;
export const ALLOWED_REPORT_MIME_TYPES = XLSX_MIME_TYPES;
export const ALLOWED_REPORT_EXTENSIONS = XLSX_EXTENSIONS;

const periodRefine = <T extends { year: number; month: number }>(
  data: T,
  ctx: z.RefinementCtx,
) => {
  const current = getCurrentPeriod();
  if (data.year > current.year) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Report year cannot be in the future",
      path: ["year"],
    });
    return;
  }
  if (isFuturePeriod(data.year, data.month)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Report period cannot be in the future",
      path: ["month"],
    });
  }
};

export const reportUploadMetadataSchema = z
  .object({
    partnerId: z.string().trim().min(1, "Partner is required"),
    year: z.coerce.number().int().min(2000).max(2100),
    month: z.coerce.number().int().min(1).max(12),
  })
  .superRefine(periodRefine);

export const reportUploadLookupMetadataSchema = z
  .object({
    year: z.coerce.number().int().min(2000).max(2100),
    month: z.coerce.number().int().min(1).max(12),
  })
  .superRefine(periodRefine);

export type ReportUploadMetadata = z.infer<typeof reportUploadMetadataSchema>;
export type ReportUploadLookupMetadata = z.infer<
  typeof reportUploadLookupMetadataSchema
>;

export function validateReportUploadFile(file: File | null): string | null {
  return validateExcelUploadFile(file);
}

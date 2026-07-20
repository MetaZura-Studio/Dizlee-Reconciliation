import { z } from "zod";

import { getCurrentPeriod, isFuturePeriod } from "@/lib/platform/period";

export const MAX_REPORT_UPLOAD_BYTES = 10 * 1024 * 1024;

export const ALLOWED_REPORT_MIME_TYPES = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
] as const;

export const ALLOWED_REPORT_EXTENSIONS = [".xlsx"] as const;

export const reportUploadMetadataSchema = z
  .object({
    opcoId: z.string().trim().min(1, "OpCo is required"),
    year: z.coerce.number().int().min(2000).max(2100),
    month: z.coerce.number().int().min(1).max(12),
  })
  .superRefine((data, ctx) => {
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
  });

export type ReportUploadMetadata = z.infer<typeof reportUploadMetadataSchema>;

export function validateReportUploadFile(file: File | null): string | null {
  if (!file) {
    return "Excel file is required";
  }

  const lowerName = file.name.toLowerCase();

  if (!ALLOWED_REPORT_EXTENSIONS.some((ext) => lowerName.endsWith(ext))) {
    return "Only .xlsx files are supported";
  }

  if (
    file.type &&
    !ALLOWED_REPORT_MIME_TYPES.includes(
      file.type as (typeof ALLOWED_REPORT_MIME_TYPES)[number],
    )
  ) {
    return "Invalid Excel file type";
  }

  if (file.size <= 0) {
    return "Uploaded file is empty";
  }

  if (file.size > MAX_REPORT_UPLOAD_BYTES) {
    return "File exceeds the 10 MB upload limit";
  }

  return null;
}

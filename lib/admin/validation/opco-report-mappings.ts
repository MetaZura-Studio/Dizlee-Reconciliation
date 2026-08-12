/**
 * Zod schemas for Admin OpCo report column mapping updates.
 */
import { z } from "zod";

import { OPCO_PARTNER_MODES } from "@/lib/admin/opco-report-mappings.shared";

const optionalHeader = z
  .string()
  .trim()
  .max(255)
  .nullable()
  .optional()
  .transform((value) => {
    if (value === undefined || value === null) {
      return null;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  });

export const selectOpcoReportMappingSheetSchema = z.object({
  sampleSheetName: z.string().trim().min(1, "Select a sheet").max(255),
});

export const updateOpcoReportMappingSchema = z
  .object({
    serviceColumn: z
      .string()
      .trim()
      .min(1, "Select a Service column")
      .max(255),
    partnerMode: z.enum(OPCO_PARTNER_MODES),
    partnerColumn: optionalHeader,
    revenueColumn: z
      .string()
      .trim()
      .min(1, "Select a Revenue column")
      .max(255),
    revenueShareColumn: optionalHeader,
    rowFilterColumn: optionalHeader,
    rowFilterValue: optionalHeader,
    aggregateDailyRows: z.boolean().optional().default(false),
  })
  .superRefine((value, ctx) => {
    if (value.partnerMode === "EXCEL_COLUMN" && !value.partnerColumn) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Select a Partner Excel column, or choose another Partner mode",
        path: ["partnerColumn"],
      });
    }
    if (value.rowFilterColumn && !value.rowFilterValue) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Enter the value that rows must match",
        path: ["rowFilterValue"],
      });
    }
    if (value.rowFilterValue && !value.rowFilterColumn) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Select which column to filter on",
        path: ["rowFilterColumn"],
      });
    }
  });

export type SelectOpcoReportMappingSheetInput = z.infer<
  typeof selectOpcoReportMappingSheetSchema
>;

export type UpdateOpcoReportMappingInput = z.infer<
  typeof updateOpcoReportMappingSchema
>;

/**
 * Zod schemas for Admin OpCo report column mapping updates.
 */
import { z } from "zod";

import {
  MAX_OPCO_ROW_FILTERS,
  OPCO_PARTNER_MODES,
} from "@/lib/admin/opco-report-mappings.shared";

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

const rowFilterItemSchema = z.object({
  column: z.string().trim().min(1, "Select which column to filter on").max(255),
  value: z
    .string()
    .trim()
    .min(1, "Enter the value that rows must match")
    .max(255),
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
    revenueShareColumn: z
      .string()
      .trim()
      .min(1, "Select a Revenue share % column")
      .max(255),
    rowFilters: z
      .array(rowFilterItemSchema)
      .max(
        MAX_OPCO_ROW_FILTERS,
        `At most ${MAX_OPCO_ROW_FILTERS} row filters are allowed`,
      )
      .optional()
      .default([]),
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
  });

export type SelectOpcoReportMappingSheetInput = z.infer<
  typeof selectOpcoReportMappingSheetSchema
>;

export type UpdateOpcoReportMappingInput = z.infer<
  typeof updateOpcoReportMappingSchema
>;

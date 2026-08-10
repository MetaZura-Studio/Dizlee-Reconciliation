/**
 * Zod schemas for Admin OpCo create/update server actions.
 */
import { z } from "zod";

export const adminEntityStatusSchema = z.enum(["ACTIVE", "INACTIVE"]);

function hasAtMostTwoDecimalPlaces(value: number): boolean {
  const scaled = value * 100;
  return Math.abs(scaled - Math.round(scaled)) < 1e-9;
}

export const opcoVatPercentSchema = z
  .number({ error: "VAT percent is required" })
  .min(0, "VAT percent must be at least 0")
  .max(100, "VAT percent must be at most 100")
  .refine(
    hasAtMostTwoDecimalPlaces,
    "VAT percent may have at most 2 decimal places",
  );

export const createOpcoSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(255),
  defaultCurrencyId: z
    .string()
    .trim()
    .regex(/^\d+$/, "Select a default currency"),
  vatPercent: opcoVatPercentSchema.default(0),
  status: adminEntityStatusSchema.default("ACTIVE"),
});

export const updateOpcoSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(255),
  defaultCurrencyId: z
    .string()
    .trim()
    .regex(/^\d+$/, "Select a default currency"),
  vatPercent: opcoVatPercentSchema,
  status: adminEntityStatusSchema,
});

export type CreateOpcoInput = z.infer<typeof createOpcoSchema>;
export type UpdateOpcoInput = z.infer<typeof updateOpcoSchema>;

/**
 * Zod schemas for Admin OpCo create/update server actions.
 */
import { z } from "zod";

export const adminEntityStatusSchema = z.enum(["ACTIVE", "INACTIVE"]);

export const createOpcoSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(255),
  defaultCurrencyId: z
    .string()
    .trim()
    .regex(/^\d+$/, "Select a default currency"),
  status: adminEntityStatusSchema.default("ACTIVE"),
});

export const updateOpcoSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(255),
  defaultCurrencyId: z
    .string()
    .trim()
    .regex(/^\d+$/, "Select a default currency"),
  status: adminEntityStatusSchema,
});

export type CreateOpcoInput = z.infer<typeof createOpcoSchema>;
export type UpdateOpcoInput = z.infer<typeof updateOpcoSchema>;

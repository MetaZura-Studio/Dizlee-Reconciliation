/**
 * Zod schemas for Admin Service–Partner map create/update.
 */
import { z } from "zod";

function hasAtMostTwoDecimalPlaces(value: number): boolean {
  const scaled = value * 100;
  return Math.abs(scaled - Math.round(scaled)) < 1e-9;
}

export const partnerRsPercentSchema = z
  .number({ error: "Partner RS percent is required" })
  .min(0, "Partner RS percent must be at least 0")
  .max(100, "Partner RS percent must be at most 100")
  .refine(
    hasAtMostTwoDecimalPlaces,
    "Partner RS percent may have at most 2 decimal places",
  );

export const createServicePartnerMapSchema = z.object({
  opcoId: z.string().trim().min(1, "OpCo is required"),
  serviceName: z.string().trim().min(1, "Service/Application name is required").max(255),
  partnerId: z.string().trim().min(1, "Partner is required"),
  partnerRsPercent: partnerRsPercentSchema.optional().default(0),
});

export const updateServicePartnerMapSchema = z.object({
  opcoId: z.string().trim().min(1, "OpCo is required"),
  serviceName: z.string().trim().min(1, "Service/Application name is required").max(255),
  partnerId: z.string().trim().min(1, "Partner is required"),
  partnerRsPercent: partnerRsPercentSchema,
});

export type CreateServicePartnerMapInput = z.infer<
  typeof createServicePartnerMapSchema
>;
export type UpdateServicePartnerMapInput = z.infer<
  typeof updateServicePartnerMapSchema
>;

/**
 * Zod schemas for Admin OpCo per-service regulatory fee updates.
 */
import { z } from "zod";

function hasAtMostTwoDecimalPlaces(value: number): boolean {
  const scaled = value * 100;
  return Math.abs(scaled - Math.round(scaled)) < 1e-9;
}

export const regulatoryFeePercentSchema = z
  .number({ error: "Regulatory fee percent is required" })
  .min(0, "Regulatory fee percent must be at least 0")
  .max(100, "Regulatory fee percent must be at most 100")
  .refine(
    hasAtMostTwoDecimalPlaces,
    "Regulatory fee percent may have at most 2 decimal places",
  );

export const updateOpcoRegulatoryFeesSchema = z.object({
  updates: z
    .array(
      z.object({
        mapId: z.string().trim().regex(/^\d+$/, "Invalid map id"),
        regulatoryFeePercent: regulatoryFeePercentSchema,
      }),
    )
    .min(1, "At least one update is required"),
});

export type UpdateOpcoRegulatoryFeesInput = z.infer<
  typeof updateOpcoRegulatoryFeesSchema
>;

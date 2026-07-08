import { z } from "zod";

function hasAtMostTwoDecimalPlaces(value: number): boolean {
  const scaled = value * 100;
  return Math.abs(scaled - Math.round(scaled)) < 1e-9;
}

export const updateReconciliationToleranceSchema = z.object({
  reconciliationNegligiblePercent: z
    .number({ error: "Tolerance is required" })
    .min(0, "Tolerance must be at least 0")
    .max(100, "Tolerance must be at most 100")
    .refine(
      hasAtMostTwoDecimalPlaces,
      "Tolerance may have at most 2 decimal places",
    ),
});

export type UpdateReconciliationToleranceInput = z.infer<
  typeof updateReconciliationToleranceSchema
>;

/**
 * Zod schemas for Admin monthly currency rate save payloads (per-period grid).
 */
import { z } from "zod";

function hasAtMostEightDecimalPlaces(value: number): boolean {
  const scaled = value * 100_000_000;
  return Math.abs(scaled - Math.round(scaled)) < 1e-6;
}

const rateValueSchema = z
  .number()
  .positive("Rate must be greater than 0")
  .refine(
    hasAtMostEightDecimalPlaces,
    "Rate may have at most 8 decimal places",
  );

export const currencyRateEntrySchema = z.object({
  currencyId: z.string().trim().min(1, "Invalid currency ID"),
  rateToUsd: rateValueSchema.nullable(),
});

export const saveCurrencyRatesSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
  rates: z.array(currencyRateEntrySchema).min(1, "At least one rate is required"),
});

export type SaveCurrencyRatesInput = z.infer<typeof saveCurrencyRatesSchema>;

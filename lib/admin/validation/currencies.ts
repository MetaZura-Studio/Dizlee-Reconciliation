import { z } from "zod";

const isoCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .min(3, "ISO code must be at least 3 characters")
  .max(8, "ISO code must be at most 8 characters")
  .regex(/^[A-Z]+$/, "ISO code must contain uppercase letters only");

export const createCurrencySchema = z.object({
  isoCode: isoCodeSchema,
  symbol: z
    .string()
    .trim()
    .max(16, "Symbol must be at most 16 characters")
    .optional()
    .transform((value) => (value === "" ? null : value ?? null)),
  decimalPrecision: z
    .number()
    .int("Decimal precision must be a whole number")
    .min(0, "Decimal precision must be at least 0")
    .max(8, "Decimal precision must be at most 8"),
});

export const updateCurrencySchema = z.object({
  symbol: z
    .string()
    .trim()
    .max(16, "Symbol must be at most 16 characters")
    .optional()
    .transform((value) => (value === "" ? null : value ?? null)),
  decimalPrecision: z
    .number()
    .int("Decimal precision must be a whole number")
    .min(0, "Decimal precision must be at least 0")
    .max(8, "Decimal precision must be at most 8"),
});

export type CreateCurrencyInput = z.infer<typeof createCurrencySchema>;
export type UpdateCurrencyInput = z.infer<typeof updateCurrencySchema>;

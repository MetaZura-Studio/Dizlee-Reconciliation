/**
 * Sample monthly FX toward USD (platform base). Each `rateToUsd` is USD per one unit of the currency;
 * USD is always 1. Used by `seed.ts` and `scripts/reseed-currency-rates.ts`.
 *
 * Multiply OpCos (KWD/SAR/JOD/BHD): rate is USD per 1 LC.
 * Divide OpCos (IQD/SDG/SSP): rate is still USD per 1 LC (Admin enters the divisor; we store 1/divisor).
 */

export type CurrencyRateSeed = {
  month: number;
  year: number;
  rateToUsd: string;
};

export const CURRENCY_RATE_SEEDS: Record<string, CurrencyRateSeed[]> = {
  USD: [
    { month: 1, year: 2026, rateToUsd: "1.00000000" },
    { month: 6, year: 2026, rateToUsd: "1.00000000" },
    { month: 8, year: 2026, rateToUsd: "1.00000000" },
  ],
  KWD: [
    { month: 1, year: 2026, rateToUsd: "3.25000000" },
    { month: 6, year: 2026, rateToUsd: "3.26000000" },
    { month: 8, year: 2026, rateToUsd: "3.26500000" },
  ],
  SAR: [
    { month: 1, year: 2026, rateToUsd: "0.26666667" },
    { month: 6, year: 2026, rateToUsd: "0.26666667" },
    { month: 8, year: 2026, rateToUsd: "0.26666667" },
  ],
  IQD: [
    { month: 1, year: 2026, rateToUsd: "0.00076000" },
    { month: 6, year: 2026, rateToUsd: "0.00076500" },
    { month: 8, year: 2026, rateToUsd: "0.00076300" },
  ],
  JOD: [
    { month: 1, year: 2026, rateToUsd: "1.41000000" },
    { month: 6, year: 2026, rateToUsd: "1.41000000" },
    { month: 8, year: 2026, rateToUsd: "1.41000000" },
  ],
  BHD: [
    { month: 1, year: 2026, rateToUsd: "2.65000000" },
    { month: 6, year: 2026, rateToUsd: "2.65000000" },
    { month: 8, year: 2026, rateToUsd: "2.65000000" },
  ],
  SDG: [
    { month: 1, year: 2026, rateToUsd: "0.00167000" },
    { month: 6, year: 2026, rateToUsd: "0.00167000" },
    { month: 8, year: 2026, rateToUsd: "0.00165000" },
  ],
  SSP: [
    { month: 1, year: 2026, rateToUsd: "0.00076000" },
    { month: 6, year: 2026, rateToUsd: "0.00076000" },
    { month: 8, year: 2026, rateToUsd: "0.00075000" },
  ],
};

/**
 * Sample monthly FX toward USD (platform base). Each `rateToUsd` is USD per one unit of the currency;
 * USD is always 1. Used by `seed.ts` and `scripts/reseed-currency-rates.ts`.
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
  ],
  KWD: [
    { month: 1, year: 2026, rateToUsd: "3.25000000" },
    { month: 6, year: 2026, rateToUsd: "3.26000000" },
  ],
  EUR: [
    { month: 1, year: 2026, rateToUsd: "1.08000000" },
    { month: 6, year: 2026, rateToUsd: "1.09000000" },
  ],
  GBP: [
    { month: 1, year: 2026, rateToUsd: "1.27000000" },
    { month: 6, year: 2026, rateToUsd: "1.28000000" },
  ],
  SAR: [
    { month: 1, year: 2026, rateToUsd: "3.75000000" },
    { month: 6, year: 2026, rateToUsd: "3.75000000" },
  ],
  IQD: [
    { month: 1, year: 2026, rateToUsd: "0.00076000" },
    { month: 6, year: 2026, rateToUsd: "0.00076500" },
  ],
  JOD: [
    { month: 1, year: 2026, rateToUsd: "1.41000000" },
    { month: 6, year: 2026, rateToUsd: "1.41000000" },
  ],
  BHD: [
    { month: 1, year: 2026, rateToUsd: "2.65000000" },
    { month: 6, year: 2026, rateToUsd: "2.65000000" },
  ],
  SDG: [
    { month: 1, year: 2026, rateToUsd: "0.00167000" },
    { month: 6, year: 2026, rateToUsd: "0.00167000" },
  ],
  SSP: [
    { month: 1, year: 2026, rateToUsd: "0.00076000" },
    { month: 6, year: 2026, rateToUsd: "0.00076000" },
  ],
  AED: [
    { month: 1, year: 2026, rateToUsd: "0.27200000" },
    { month: 6, year: 2026, rateToUsd: "0.27200000" },
  ],
  OMR: [
    { month: 1, year: 2026, rateToUsd: "2.60000000" },
    { month: 6, year: 2026, rateToUsd: "2.60000000" },
  ],
};

export type CurrencyRateSeed = {
  month: number;
  year: number;
  rateToUsd: string;
};

/**
 * Seed rates are toward platform base KWD (1 KWD = 1).
 * Approximated from prior USD-based seeds (KWD ≈ 3.25–3.26 USD).
 */
export const CURRENCY_RATE_SEEDS: Record<string, CurrencyRateSeed[]> = {
  KWD: [
    { month: 1, year: 2026, rateToUsd: "1.00000000" },
    { month: 6, year: 2026, rateToUsd: "1.00000000" },
  ],
  USD: [
    { month: 1, year: 2026, rateToUsd: "0.30769231" },
    { month: 6, year: 2026, rateToUsd: "0.30674847" },
  ],
  EUR: [
    { month: 1, year: 2026, rateToUsd: "0.33230769" },
    { month: 6, year: 2026, rateToUsd: "0.33435583" },
  ],
  GBP: [
    { month: 1, year: 2026, rateToUsd: "0.39076923" },
    { month: 6, year: 2026, rateToUsd: "0.39263804" },
  ],
  SAR: [
    { month: 1, year: 2026, rateToUsd: "1.15384615" },
    { month: 6, year: 2026, rateToUsd: "1.15030675" },
  ],
  IQD: [
    { month: 1, year: 2026, rateToUsd: "0.00023385" },
    { month: 6, year: 2026, rateToUsd: "0.00023466" },
  ],
  JOD: [
    { month: 1, year: 2026, rateToUsd: "0.43384615" },
    { month: 6, year: 2026, rateToUsd: "0.43251534" },
  ],
  BHD: [
    { month: 1, year: 2026, rateToUsd: "0.81538462" },
    { month: 6, year: 2026, rateToUsd: "0.81288344" },
  ],
  SDG: [
    { month: 1, year: 2026, rateToUsd: "0.00051385" },
    { month: 6, year: 2026, rateToUsd: "0.00051227" },
  ],
  SSP: [
    { month: 1, year: 2026, rateToUsd: "0.00023385" },
    { month: 6, year: 2026, rateToUsd: "0.00023313" },
  ],
  AED: [
    { month: 1, year: 2026, rateToUsd: "0.08369231" },
    { month: 6, year: 2026, rateToUsd: "0.08343558" },
  ],
  OMR: [
    { month: 1, year: 2026, rateToUsd: "0.80000000" },
    { month: 6, year: 2026, rateToUsd: "0.79754601" },
  ],
};

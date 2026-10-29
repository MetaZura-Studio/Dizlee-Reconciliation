/**
 * ISO currency catalog seeded before monthly rates and OpCo default-currency links.
 * Precision matches platform rounding rules for reconciliation and invoicing.
 * Catalog is limited to USD + OpCo settlement currencies.
 */

export type CurrencySeed = {
  isoCode: string;
  symbol: string;
  decimalPrecision: number;
};

/** ISO codes no longer in the active catalog (soft-deleted on seed). */
export const REMOVED_CURRENCY_ISO_CODES = [
  "EUR",
  "GBP",
  "AED",
  "OMR",
] as const;

export const CURRENCY_SEEDS: CurrencySeed[] = [
  { isoCode: "USD", symbol: "$", decimalPrecision: 2 },
  { isoCode: "KWD", symbol: "KD", decimalPrecision: 3 },
  { isoCode: "SAR", symbol: "SR", decimalPrecision: 2 },
  { isoCode: "IQD", symbol: "IQD", decimalPrecision: 3 },
  { isoCode: "JOD", symbol: "JD", decimalPrecision: 3 },
  { isoCode: "BHD", symbol: "BD", decimalPrecision: 3 },
  { isoCode: "SDG", symbol: "SDG", decimalPrecision: 2 },
  { isoCode: "SSP", symbol: "SSP", decimalPrecision: 2 },
];

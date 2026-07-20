export type CurrencySeed = {
  isoCode: string;
  symbol: string;
  decimalPrecision: number;
};

export const CURRENCY_SEEDS: CurrencySeed[] = [
  { isoCode: "KWD", symbol: "KD", decimalPrecision: 3 },
  { isoCode: "USD", symbol: "$", decimalPrecision: 2 },
  { isoCode: "EUR", symbol: "€", decimalPrecision: 2 },
  { isoCode: "GBP", symbol: "£", decimalPrecision: 2 },
  { isoCode: "SAR", symbol: "SR", decimalPrecision: 2 },
  { isoCode: "IQD", symbol: "IQD", decimalPrecision: 3 },
  { isoCode: "JOD", symbol: "JD", decimalPrecision: 3 },
  { isoCode: "BHD", symbol: "BD", decimalPrecision: 3 },
  { isoCode: "SDG", symbol: "SDG", decimalPrecision: 2 },
  { isoCode: "SSP", symbol: "SSP", decimalPrecision: 2 },
  { isoCode: "AED", symbol: "AED", decimalPrecision: 2 },
  { isoCode: "OMR", symbol: "OMR", decimalPrecision: 3 },
];

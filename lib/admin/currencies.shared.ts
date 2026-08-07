/**
 * Shared currency and monthly-rate view types for Admin Currencies UI and loaders.
 * `rateToUsd` is toward platform base (see lib/platform/currency-rates); USD is base rate 1.
 */
export type CurrencyListItem = {
  id: string;
  isoCode: string;
  symbol: string | null;
  decimalPrecision: number;
};

export type MonthlyRateRow = {
  currencyId: string;
  isoCode: string;
  symbol: string | null;
  /** Rate toward platform base (USD). Prisma field remains `rateToUsd`. */
  rateToUsd: number | null;
  hasRate: boolean;
  isBase: boolean;
};

export type CurrencyRatesPeriodView = {
  month: number;
  year: number;
  periodLabel: string;
  rates: MonthlyRateRow[];
  setCount: number;
  totalCurrencies: number;
  isCurrent: boolean;
};

export type CurrencyRatePeriodOption = {
  month: number;
  year: number;
  label: string;
  isCurrent: boolean;
};

export type CurrenciesPageData = {
  currencies: CurrencyListItem[];
  rates: CurrencyRatesPeriodView;
  periods: CurrencyRatePeriodOption[];
};

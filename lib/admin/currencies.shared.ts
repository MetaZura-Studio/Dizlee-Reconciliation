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
  rateToUsd: number | null;
  hasRate: boolean;
  isUsd: boolean;
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

import { CurrenciesPageClient } from "@/components/admin/currencies-page-client";
import {
  CurrencyActionError,
  listCurrencies,
} from "@/lib/admin/currencies";
import {
  currentCalendarPeriod,
  CurrencyRatesError,
  getRatesForPeriod,
  listRatePeriods,
} from "@/lib/admin/currency-rates";
import type { CurrenciesPageData } from "@/lib/admin/currencies.shared";

export default async function AdminCurrenciesPage() {
  let pageData: CurrenciesPageData | null = null;
  let errorMessage: string | null = null;

  try {
    const period = currentCalendarPeriod();
    const [currencies, rates, periods] = await Promise.all([
      listCurrencies(),
      getRatesForPeriod(period.month, period.year),
      listRatePeriods(),
    ]);
    pageData = { currencies, rates, periods };
  } catch (error) {
    errorMessage =
      error instanceof CurrencyActionError || error instanceof CurrencyRatesError
        ? error.message
        : "Currency data could not be loaded.";
  }

  if (errorMessage) {
    return (
      <div className="mx-auto max-w-5xl space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight">
          Currencies &amp; USD rates
        </h1>
        <p className="rounded-md border border-danger-border bg-danger-muted px-3 py-2 text-sm text-danger">
          {errorMessage}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Currencies &amp; USD rates
        </h1>
        <p className="text-sm text-foreground-muted">
          Set monthly exchange rates for billing (Monthly rates), or manage which
          currencies exist in the system (Currencies).
        </p>
      </div>

      <CurrenciesPageClient initialData={pageData!} />
    </div>
  );
}

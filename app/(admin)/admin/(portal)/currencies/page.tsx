import { CurrenciesPageClient } from "@/components/admin/currencies-page-client";
import {
  CurrencyActionError,
  listCurrencies,
} from "@/lib/admin/currencies";
import {
  currentCalendarPeriod,
  CurrencyRatesError,
  getRatesForPeriod,
} from "@/lib/admin/currency-rates";
import type { CurrenciesPageData } from "@/lib/admin/currencies.shared";

export default async function AdminCurrenciesPage() {
  let pageData: CurrenciesPageData | null = null;
  let errorMessage: string | null = null;

  try {
    const period = currentCalendarPeriod();
    const [currencies, rates] = await Promise.all([
      listCurrencies(),
      getRatesForPeriod(period.month, period.year),
    ]);
    pageData = { currencies, rates };
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
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorMessage}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Currencies &amp; USD rates
        </h1>
        <p className="text-sm text-zinc-600">
          Manage the currency master list and monthly USD exchange rates used for
          billing and dashboard KPIs.
        </p>
      </div>

      <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
        Monthly rates are stored per reporting period. Select a past month to
        browse historical rates or correct earlier values.
      </p>

      <CurrenciesPageClient initialData={pageData!} />
    </div>
  );
}

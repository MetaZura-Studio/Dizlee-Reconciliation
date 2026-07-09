"use client";

import { useState } from "react";

import { CurrenciesView } from "@/components/admin/currencies-view";
import { CurrencyRatesSection } from "@/components/admin/currency-rates-section";
import type { CurrenciesPageData } from "@/lib/admin/currencies.shared";

type CurrenciesPageClientProps = {
  initialData: CurrenciesPageData;
};

export function CurrenciesPageClient({ initialData }: CurrenciesPageClientProps) {
  const [notice, setNotice] = useState<string | null>(null);
  const [noticeError, setNoticeError] = useState<string | null>(null);

  const handleNotice = (message: string | null, error?: string | null) => {
    setNotice(message);
    setNoticeError(error ?? null);
  };

  return (
    <div className="space-y-6">
      {noticeError ? (
        <p className="rounded-md border border-danger-border bg-danger-muted px-3 py-2 text-sm text-danger">
          {noticeError}
        </p>
      ) : null}
      {notice ? (
        <p className="rounded-md border border-success-border bg-success-muted px-3 py-2 text-sm text-success">
          {notice}
        </p>
      ) : null}

      <CurrenciesView
        initialCurrencies={initialData.currencies}
        onNotice={handleNotice}
      />

      <CurrencyRatesSection
        initialRates={initialData.rates}
        onNotice={handleNotice}
      />
    </div>
  );
}

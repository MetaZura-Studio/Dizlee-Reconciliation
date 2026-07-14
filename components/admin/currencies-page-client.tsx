"use client";

import { useState } from "react";

import { CurrenciesView } from "@/components/admin/currencies-view";
import { CurrencyRatesSection } from "@/components/admin/currency-rates-section";
import type { CurrenciesPageData } from "@/lib/admin/currencies.shared";
import { cn, ui } from "@/lib/ui/classes";

type PageTab = "rates" | "currencies";

type CurrenciesPageClientProps = {
  initialData: CurrenciesPageData;
};

export function CurrenciesPageClient({ initialData }: CurrenciesPageClientProps) {
  const [tab, setTab] = useState<PageTab>("rates");
  const [notice, setNotice] = useState<string | null>(null);
  const [noticeError, setNoticeError] = useState<string | null>(null);

  const handleNotice = (message: string | null, error?: string | null) => {
    setNotice(message);
    setNoticeError(error ?? null);
  };

  return (
    <div className="space-y-4">
      {noticeError ? <p className={ui.alertError}>{noticeError}</p> : null}
      {notice ? <p className={ui.alertSuccess}>{notice}</p> : null}

      <div className="flex rounded-2xl border border-border bg-surface-muted/50 p-1">
        {(
          [
            ["rates", "Monthly rates"],
            ["currencies", "Currencies"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "rounded-xl px-3.5 py-1.5 text-sm font-medium transition-colors",
              tab === id
                ? "bg-surface text-foreground shadow-[var(--shadow-sm)]"
                : "text-foreground-muted hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "rates" ? (
        <CurrencyRatesSection
          initialRates={initialData.rates}
          initialPeriods={initialData.periods}
          onNotice={handleNotice}
        />
      ) : (
        <CurrenciesView
          initialCurrencies={initialData.currencies}
          onNotice={handleNotice}
        />
      )}
    </div>
  );
}

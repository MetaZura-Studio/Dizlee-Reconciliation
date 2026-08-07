/**
 * Platform monthly FX rates — DB reads, rolling periods, and save-plan diff for Admin UI.
 * Base currency USD at rate 1; `rateToUsd` is units of USD per one unit of currency (legacy column name).
 * Used by Admin Currencies and Dizlee dashboard FX conversion.
 */
import { prisma } from "@/lib/prisma";

function toNumber(value: unknown): number {
  if (value === null || value === undefined) {
    return 0;
  }
  return Number(value as never);
}

export type MonthlyRateRecord = {
  currencyId: string;
  rateToUsd: number;
};

export async function getMonthlyRatesForPeriod(
  month: number,
  year: number,
): Promise<MonthlyRateRecord[]> {
  const rates = await prisma.currencyMonthlyRate.findMany({
    where: { month, year, isDeleted: false },
    select: { currencyId: true, rateToUsd: true },
  });

  return rates.map((rate) => ({
    currencyId: rate.currencyId.toString(),
    rateToUsd: toNumber(rate.rateToUsd),
  }));
}

export function formatCurrencyPeriodLabel(month: number, year: number): string {
  return new Date(year, month - 1, 1).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });
}

export function currentCalendarPeriodFromDate(now = new Date()): {
  month: number;
  year: number;
} {
  return { month: now.getMonth() + 1, year: now.getFullYear() };
}

export function isSameCalendarPeriod(
  month: number,
  year: number,
  current: { month: number; year: number } = currentCalendarPeriodFromDate(),
): boolean {
  return month === current.month && year === current.year;
}

/** Walk back `count` months from a given period (including that period). */
export function buildRollingPeriods(
  from: { month: number; year: number },
  count: number,
): Array<{ month: number; year: number }> {
  const periods: Array<{ month: number; year: number }> = [];
  let month = from.month;
  let year = from.year;

  for (let i = 0; i < count; i += 1) {
    periods.push({ month, year });
    month -= 1;
    if (month < 1) {
      month = 12;
      year -= 1;
    }
  }

  return periods;
}

/** Platform base currency. Stored FX values (`rate_to_usd`) mean rate toward this ISO. */
export const BASE_CURRENCY_ISO_CODE = "USD" as const;
export const BASE_CURRENCY_RATE = 1;

export type RateSavePlan = {
  toUpsert: Array<{ currencyId: string; rateToUsd: number }>;
  toSoftDelete: string[];
  updated: number;
  cleared: number;
};

/** Diff submitted grid against catalog — null rate soft-deletes; base ISO always upserts at 1. */
export function computeRateSavePlan(params: {
  currencies: Array<{ id: string; isoCode: string }>;
  submittedRates: Array<{ currencyId: string; rateToUsd: number | null }>;
}): RateSavePlan {
  const submittedById = new Map(
    params.submittedRates.map((entry) => [entry.currencyId, entry.rateToUsd]),
  );

  const toUpsert: Array<{ currencyId: string; rateToUsd: number }> = [];
  const toSoftDelete: string[] = [];

  for (const currency of params.currencies) {
    if (!submittedById.has(currency.id)) {
      continue;
    }

    const submitted = submittedById.get(currency.id);
    if (currency.isoCode === BASE_CURRENCY_ISO_CODE) {
      toUpsert.push({ currencyId: currency.id, rateToUsd: BASE_CURRENCY_RATE });
      continue;
    }

    if (submitted === null || submitted === undefined) {
      toSoftDelete.push(currency.id);
      continue;
    }

    toUpsert.push({ currencyId: currency.id, rateToUsd: submitted });
  }

  return {
    toUpsert,
    toSoftDelete,
    updated: toUpsert.length,
    cleared: toSoftDelete.length,
  };
}

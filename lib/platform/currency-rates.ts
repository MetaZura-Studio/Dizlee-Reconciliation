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
    where: { month, year },
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

export const USD_ISO_CODE = "USD" as const;
export const USD_RATE = 1;

export type RateSavePlan = {
  toUpsert: Array<{ currencyId: string; rateToUsd: number }>;
  toSoftDelete: string[];
  updated: number;
  cleared: number;
};

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
    if (currency.isoCode === USD_ISO_CODE) {
      toUpsert.push({ currencyId: currency.id, rateToUsd: USD_RATE });
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

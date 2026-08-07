/**
 * Admin monthly FX rates — load/save per (currencyId, month, year) with soft-delete diffs.
 * Delegates period math and save planning to lib/platform/currency-rates; audits rate changes.
 * Base currency row is always present at rate 1 for the selected period.
 */
import type { Prisma } from "@prisma/client";

import { writeCurrencyAuditLog } from "@/lib/admin/audit";
import { listCurrencies } from "@/lib/admin/currencies";
import type {
  CurrencyRatePeriodOption,
  CurrencyRatesPeriodView,
} from "@/lib/admin/currencies.shared";
import {
  saveCurrencyRatesSchema,
  type SaveCurrencyRatesInput,
} from "@/lib/admin/validation/currency-rates";
import {
  buildRollingPeriods,
  computeRateSavePlan,
  currentCalendarPeriodFromDate,
  formatCurrencyPeriodLabel,
  getMonthlyRatesForPeriod,
  isSameCalendarPeriod,
  BASE_CURRENCY_ISO_CODE,
  BASE_CURRENCY_RATE,
} from "@/lib/platform/currency-rates";
import { prisma } from "@/lib/prisma";

export type { CurrencyRatesPeriodView, CurrencyRatePeriodOption } from "@/lib/admin/currencies.shared";

const ROLLING_PERIOD_COUNT = 24;

export class CurrencyRatesError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "CurrencyRatesError";
    this.status = status;
  }
}

function parsePeriod(monthRaw: number, yearRaw: number): { month: number; year: number } {
  if (!Number.isInteger(monthRaw) || monthRaw < 1 || monthRaw > 12) {
    throw new CurrencyRatesError("Invalid month");
  }
  if (!Number.isInteger(yearRaw) || yearRaw < 2000 || yearRaw > 2100) {
    throw new CurrencyRatesError("Invalid year");
  }

  return { month: monthRaw, year: yearRaw };
}

export function currentCalendarPeriod(): { month: number; year: number } {
  return currentCalendarPeriodFromDate();
}

export async function getRatesForPeriod(
  monthRaw: number,
  yearRaw: number,
): Promise<CurrencyRatesPeriodView> {
  const { month, year } = parsePeriod(monthRaw, yearRaw);
  const current = currentCalendarPeriod();
  const [currencies, monthlyRates] = await Promise.all([
    listCurrencies(),
    getMonthlyRatesForPeriod(month, year),
  ]);

  const rateByCurrencyId = new Map(
    monthlyRates.map((rate) => [rate.currencyId, rate.rateToUsd]),
  );

  const rates = currencies.map((currency) => {
    const storedRate = rateByCurrencyId.get(currency.id);
    const isBase = currency.isoCode === BASE_CURRENCY_ISO_CODE;
    const rateToUsd = isBase ? BASE_CURRENCY_RATE : (storedRate ?? null);

    return {
      currencyId: currency.id,
      isoCode: currency.isoCode,
      symbol: currency.symbol,
      rateToUsd,
      hasRate: isBase || storedRate !== undefined,
      isBase,
    };
  });

  const setCount = rates.filter((rate) => rate.hasRate).length;

  return {
    month,
    year,
    periodLabel: formatCurrencyPeriodLabel(month, year),
    rates,
    setCount,
    totalCurrencies: currencies.length,
    isCurrent: isSameCalendarPeriod(month, year, current),
  };
}

export async function listRatePeriods(): Promise<CurrencyRatePeriodOption[]> {
  const current = currentCalendarPeriod();
  const rolling = buildRollingPeriods(current, ROLLING_PERIOD_COUNT);

  const stored = await prisma.currencyMonthlyRate.findMany({
    where: { isDeleted: false },
    distinct: ["year", "month"],
    select: { year: true, month: true },
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });

  const key = (month: number, year: number) => `${year}-${month}`;
  const seen = new Set<string>();
  const periods: CurrencyRatePeriodOption[] = [];

  function add(month: number, year: number) {
    const id = key(month, year);
    if (seen.has(id)) {
      return;
    }
    seen.add(id);
    periods.push({
      month,
      year,
      label: formatCurrencyPeriodLabel(month, year),
      isCurrent: isSameCalendarPeriod(month, year, current),
    });
  }

  add(current.month, current.year);
  for (const period of rolling) {
    add(period.month, period.year);
  }
  for (const period of stored) {
    add(period.month, period.year);
  }

  periods.sort((a, b) => {
    if (a.year !== b.year) {
      return b.year - a.year;
    }
    return b.month - a.month;
  });

  return periods;
}

export async function saveRatesForPeriod(
  rawInput: SaveCurrencyRatesInput,
  actorUserId: bigint,
): Promise<CurrencyRatesPeriodView> {
  const parsed = saveCurrencyRatesSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new CurrencyRatesError(
      parsed.error.issues[0]?.message ?? "Invalid input",
    );
  }

  const { month, year } = parsePeriod(parsed.data.month, parsed.data.year);

  const currencies = await listCurrencies();
  const currencyIdSet = new Set(currencies.map((currency) => currency.id));

  for (const entry of parsed.data.rates) {
    if (!currencyIdSet.has(entry.currencyId)) {
      throw new CurrencyRatesError("Invalid currency ID");
    }
  }

  for (const entry of parsed.data.rates) {
    const currency = currencies.find((item) => item.id === entry.currencyId);
    if (
      currency?.isoCode === BASE_CURRENCY_ISO_CODE &&
      entry.rateToUsd !== null &&
      entry.rateToUsd !== BASE_CURRENCY_RATE
    ) {
      throw new CurrencyRatesError(`${BASE_CURRENCY_ISO_CODE} rate must be 1`);
    }
  }

  const plan = computeRateSavePlan({
    currencies,
    submittedRates: parsed.data.rates,
  });

  const now = new Date();
  const operations: Prisma.PrismaPromise<unknown>[] = [];

  for (const entry of plan.toUpsert) {
    const currencyId = BigInt(entry.currencyId);
    operations.push(
      prisma.currencyMonthlyRate.upsert({
        where: {
          currencyId_year_month: { currencyId, year, month },
        },
        create: {
          currencyId,
          month,
          year,
          rateToUsd: entry.rateToUsd,
          createdByUserId: actorUserId,
          updatedByUserId: actorUserId,
          isDeleted: false,
        },
        update: {
          rateToUsd: entry.rateToUsd,
          isDeleted: false,
          deletedAt: null,
          deletedByUserId: null,
          updatedByUserId: actorUserId,
        },
      }),
    );
  }

  for (const currencyIdStr of plan.toSoftDelete) {
    const currencyId = BigInt(currencyIdStr);
    operations.push(
      prisma.currencyMonthlyRate.updateMany({
        where: {
          currencyId,
          month,
          year,
          isDeleted: false,
        },
        data: {
          isDeleted: true,
          deletedAt: now,
          deletedByUserId: actorUserId,
          updatedByUserId: actorUserId,
        },
      }),
    );
  }

  if (operations.length > 0) {
    await prisma.$transaction(operations);
  }

  const auditCurrencyId = currencies[0] ? BigInt(currencies[0].id) : BigInt(1);
  await writeCurrencyAuditLog({
    actorUserId,
    action: "CURRENCY_RATE_UPDATED",
    currencyId: auditCurrencyId,
    message: `Monthly rates saved for ${formatCurrencyPeriodLabel(month, year)}.`,
    metadata: {
      month,
      year,
      updated: plan.updated,
      cleared: plan.cleared,
    },
  });

  return getRatesForPeriod(month, year);
}

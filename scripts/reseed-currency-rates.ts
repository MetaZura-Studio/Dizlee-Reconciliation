/**
 * Refreshes currency rows and monthly `rateToUsd` samples from `prisma/seed-data` without touching other tables.
 */

import { PrismaClient } from "@prisma/client";

import { CURRENCY_RATE_SEEDS } from "../prisma/seed-data/currency-rates";
import { CURRENCY_SEEDS } from "../prisma/seed-data/currencies";

const prisma = new PrismaClient();

async function main() {
  const currencyIds = new Map<string, bigint>();

  for (const currency of CURRENCY_SEEDS) {
    const record = await prisma.currency.upsert({
      where: { isoCode: currency.isoCode },
      update: {
        symbol: currency.symbol,
        decimalPrecision: currency.decimalPrecision,
        isDeleted: false,
      },
      create: {
        isoCode: currency.isoCode,
        symbol: currency.symbol,
        decimalPrecision: currency.decimalPrecision,
      },
    });
    currencyIds.set(currency.isoCode, record.id);
  }

  let upserted = 0;
  for (const [isoCode, rates] of Object.entries(CURRENCY_RATE_SEEDS)) {
    const currencyId = currencyIds.get(isoCode);
    if (!currencyId) {
      throw new Error(`Missing currency for rate seed: ${isoCode}`);
    }
    for (const rate of rates) {
      await prisma.currencyMonthlyRate.upsert({
        where: {
          currencyId_year_month: {
            currencyId,
            year: rate.year,
            month: rate.month,
          },
        },
        update: {
          rateToUsd: rate.rateToUsd,
          isDeleted: false,
        },
        create: {
          currencyId,
          month: rate.month,
          year: rate.year,
          rateToUsd: rate.rateToUsd,
        },
      });
      upserted += 1;
    }
  }

  const sample = await prisma.currencyMonthlyRate.findMany({
    where: { year: 2026, month: { in: [1, 6, 8] }, isDeleted: false },
    include: { currency: { select: { isoCode: true } } },
    orderBy: [{ month: "asc" }, { currency: { isoCode: "asc" } }],
  });

  console.log(
    JSON.stringify(
      {
        upserted,
        samples: sample
          .filter((r) => ["USD", "KWD", "EUR", "IQD"].includes(r.currency.isoCode))
          .map((r) => ({
            iso: r.currency.isoCode,
            month: r.month,
            year: r.year,
            rateToUsd: r.rateToUsd.toString(),
          })),
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

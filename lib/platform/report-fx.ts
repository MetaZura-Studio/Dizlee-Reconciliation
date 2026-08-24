/**
 * Convert report local-currency amounts to USD using Admin monthly rates.
 * Amount on the file is always OpCo/Partner local currency; USD is display-only.
 */
import {
  BASE_CURRENCY_ISO_CODE,
  BASE_CURRENCY_RATE,
  getMonthlyRatesForPeriod,
} from "@/lib/platform/currency-rates";
import { prisma } from "@/lib/prisma";

export type ReportFx = {
  currencyCode: string;
  rateToUsd: number | null;
};

export function formatFxNumber(value: number, maxDigits = 6): string {
  if (!Number.isFinite(value)) {
    return "—";
  }
  return String(Number(value.toFixed(maxDigits)));
}

export function applyReportFxToAmount(
  amount: string | number | null | undefined,
  rateToUsd: number | null,
): { exchangeRate: string | null; amountUsd: string | null } {
  if (rateToUsd === null || !Number.isFinite(rateToUsd) || rateToUsd <= 0) {
    return { exchangeRate: null, amountUsd: null };
  }

  const local =
    typeof amount === "number"
      ? amount
      : amount == null || amount === ""
        ? null
        : Number(amount);

  return {
    exchangeRate: formatFxNumber(rateToUsd),
    amountUsd:
      local === null || !Number.isFinite(local)
        ? null
        : formatFxNumber(local * rateToUsd, 4),
  };
}

export async function getReportFx(params: {
  currencyId: bigint;
  month: number;
  year: number;
}): Promise<ReportFx> {
  const currency = await prisma.currency.findFirst({
    where: { id: params.currencyId, isDeleted: false },
    select: { isoCode: true },
  });
  const currencyCode = currency?.isoCode ?? BASE_CURRENCY_ISO_CODE;

  if (currencyCode === BASE_CURRENCY_ISO_CODE) {
    return { currencyCode, rateToUsd: BASE_CURRENCY_RATE };
  }

  const rates = await getMonthlyRatesForPeriod(params.month, params.year);
  const match = rates.find(
    (rate) => rate.currencyId === params.currencyId.toString(),
  );
  if (
    match === undefined ||
    !Number.isFinite(match.rateToUsd) ||
    match.rateToUsd <= 0
  ) {
    return { currencyCode, rateToUsd: null };
  }

  return { currencyCode, rateToUsd: match.rateToUsd };
}

export async function getOpcoReportFx(params: {
  opcoId: bigint;
  month: number;
  year: number;
}): Promise<ReportFx> {
  const opco = await prisma.opco.findFirst({
    where: { id: params.opcoId, isDeleted: false },
    select: { defaultCurrencyId: true },
  });
  if (!opco) {
    return { currencyCode: BASE_CURRENCY_ISO_CODE, rateToUsd: null };
  }
  return getReportFx({
    currencyId: opco.defaultCurrencyId,
    month: params.month,
    year: params.year,
  });
}

/**
 * Convert report local-currency amounts to USD using Admin monthly rates.
 * Amount on the file is OpCo/Partner local currency; usageUsd holds converted USD.
 */
import {
  BASE_CURRENCY_ISO_CODE,
  BASE_CURRENCY_RATE,
  getMonthlyRatesForPeriod,
} from "@/lib/platform/currency-rates";
import { decimalPrecisionForCurrency } from "@/lib/platform/format-money";
import { prisma } from "@/lib/prisma";
import { DomainError } from "@/lib/errors/app-error";

export type ReportFx = {
  currencyCode: string;
  rateToUsd: number | null;
};

export class PartnerReportFxError extends DomainError {
  constructor(keyOrMessage: string, status = 400) {
    super("PartnerReportFxError", keyOrMessage, status);
  }
}

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

  const usdDigits = decimalPrecisionForCurrency(BASE_CURRENCY_ISO_CODE);

  return {
    exchangeRate: formatFxNumber(rateToUsd),
    amountUsd:
      local === null || !Number.isFinite(local)
        ? null
        : formatFxNumber(local * rateToUsd, usdDigits),
  };
}

type FxSnapshotLine = {
  amount: number | null;
  exchangeRate: number | null;
  usageUsd: number | null;
};

type FxSnapshotLineWithCurrency = FxSnapshotLine & {
  currencyCode?: string | null;
  lineNumber?: number;
};

/**
 * Stamp Admin monthly FX onto parsed lines before DB insert (historical snapshot).
 * When rate is missing, lines are left unchanged.
 */
export function snapshotFxOntoParsedLines<T extends FxSnapshotLine>(
  lines: T[],
  rateToUsd: number | null,
): T[] {
  if (rateToUsd === null || !Number.isFinite(rateToUsd) || rateToUsd <= 0) {
    return lines;
  }

  return lines.map((line) => {
    const converted = applyReportFxToAmount(line.amount, rateToUsd);
    return {
      ...line,
      exchangeRate: rateToUsd,
      usageUsd:
        converted.amountUsd !== null
          ? Number(converted.amountUsd)
          : line.usageUsd,
    };
  });
}

/**
 * Load Admin monthly rates keyed by uppercase ISO for a report period.
 * USD is always rate 1 even if not stored in DB.
 */
export async function getMonthlyRatesByIso(
  month: number,
  year: number,
): Promise<Map<string, number>> {
  const rates = await getMonthlyRatesForPeriod(month, year);
  const byIso = new Map<string, number>();
  byIso.set(BASE_CURRENCY_ISO_CODE, BASE_CURRENCY_RATE);

  if (rates.length === 0) {
    return byIso;
  }

  const currencyIds = rates.map((rate) => BigInt(rate.currencyId));
  const currencies = await prisma.currency.findMany({
    where: { id: { in: currencyIds }, isDeleted: false },
    select: { id: true, isoCode: true },
  });
  const idToIso = new Map(
    currencies.map((currency) => [
      currency.id.toString(),
      currency.isoCode.trim().toUpperCase(),
    ]),
  );

  for (const rate of rates) {
    const iso = idToIso.get(rate.currencyId);
    if (!iso) {
      continue;
    }
    if (!Number.isFinite(rate.rateToUsd) || rate.rateToUsd <= 0) {
      continue;
    }
    byIso.set(iso, rate.rateToUsd);
  }

  return byIso;
}

function resolveLineCurrencyIso(currencyCode: string | null | undefined): string {
  const trimmed = currencyCode?.trim().toUpperCase() ?? "";
  return trimmed || BASE_CURRENCY_ISO_CODE;
}

/**
 * Partner per-row FX: leave `amount` as local; stamp `exchangeRate` + `usageUsd`.
 * USD (or blank currency) → rate 1. Unknown ISO or missing rate → throws.
 */
export function snapshotFxOntoParsedLinesByCurrency<
  T extends FxSnapshotLineWithCurrency,
>(lines: T[], ratesByIso: Map<string, number>): T[] {
  return lines.map((line) => {
    const iso = resolveLineCurrencyIso(line.currencyCode);
    const rateToUsd = ratesByIso.get(iso);

    if (rateToUsd === undefined || !Number.isFinite(rateToUsd) || rateToUsd <= 0) {
      const lineLabel =
        line.lineNumber != null ? ` (line ${line.lineNumber})` : "";
      throw new PartnerReportFxError(
        `No USD rate for ${iso}${lineLabel} in this period. Set it in Admin Currencies before uploading.`,
      );
    }

    const converted = applyReportFxToAmount(line.amount, rateToUsd);
    return {
      ...line,
      currencyCode: iso,
      exchangeRate: rateToUsd,
      usageUsd:
        converted.amountUsd !== null
          ? Number(converted.amountUsd)
          : line.usageUsd,
    };
  });
}

/**
 * Apply per-row Partner FX for a report period (load rates + snapshot).
 */
export async function applyPartnerPerRowFx<T extends FxSnapshotLineWithCurrency>(
  lines: T[],
  month: number,
  year: number,
): Promise<T[]> {
  const ratesByIso = await getMonthlyRatesByIso(month, year);
  return snapshotFxOntoParsedLinesByCurrency(lines, ratesByIso);
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

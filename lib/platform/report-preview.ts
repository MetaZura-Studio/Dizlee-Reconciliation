/**
 * Maps parsed Excel report lines to string preview DTOs for upload confirmation UI.
 */
import type { ParsedReportLine } from "@/lib/platform/excel/parse-report";
import { BASE_CURRENCY_ISO_CODE } from "@/lib/platform/currency-rates";
import { formatMoney } from "@/lib/platform/format-money";
import {
  applyReportFxToAmount,
  type ReportFx,
} from "@/lib/platform/report-fx";

export type ReportPreviewLineItem = {
  lineNumber: number;
  description: string | null;
  amount: string | null;
  amountUsd: string | null;
  exchangeRate: string | null;
  usageAmount: string | null;
  usageUsd: string | null;
  usageUnit: string | null;
  reconciliationBasis: string | null;
  currencyCode?: string | null;
};

function formatAmount(
  value: number | null,
  currencyIsoCode: string,
): string | null {
  if (value === null) {
    return null;
  }
  return formatMoney(value, currencyIsoCode, {
    style: "decimal",
    empty: "—",
  });
}

export function mapParsedLinesToPreview(
  lines: ParsedReportLine[],
  fx?: ReportFx,
  ratesByIso?: Map<string, number>,
): ReportPreviewLineItem[] {
  const fallbackRate = fx?.rateToUsd ?? null;
  const fallbackIso = fx?.currencyCode ?? BASE_CURRENCY_ISO_CODE;

  return lines.map((item) => {
    const iso =
      item.currencyCode?.trim().toUpperCase() ||
      fallbackIso ||
      BASE_CURRENCY_ISO_CODE;
    const rateToUsd =
      ratesByIso?.get(iso) ??
      (iso === BASE_CURRENCY_ISO_CODE ? 1 : fallbackRate);
    const converted = applyReportFxToAmount(item.amount, rateToUsd ?? null);
    const usageUsdFormatted =
      item.usageUsd !== null
        ? formatAmount(item.usageUsd, BASE_CURRENCY_ISO_CODE)
        : converted.amountUsd;

    return {
      lineNumber: item.lineNumber,
      description: item.description,
      amount: formatAmount(item.amount, iso),
      amountUsd: usageUsdFormatted ?? converted.amountUsd,
      exchangeRate: converted.exchangeRate,
      usageAmount: formatAmount(item.usageAmount, iso),
      usageUsd: formatAmount(item.usageUsd, BASE_CURRENCY_ISO_CODE),
      usageUnit: item.usageUnit,
      reconciliationBasis: item.reconciliationBasis,
      currencyCode: iso,
    };
  });
}

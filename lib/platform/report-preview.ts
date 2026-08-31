/**
 * Maps parsed Excel report lines to string preview DTOs for upload confirmation UI.
 */
import type { ParsedReportLine } from "@/lib/platform/excel/parse-report";
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
): ReportPreviewLineItem[] {
  const rateToUsd = fx?.rateToUsd ?? null;
  const localIso = fx?.currencyCode ?? "USD";
  return lines.map((item) => {
    const converted = applyReportFxToAmount(item.amount, rateToUsd);
    return {
      lineNumber: item.lineNumber,
      description: item.description,
      amount: formatAmount(item.amount, localIso),
      amountUsd: converted.amountUsd,
      exchangeRate: converted.exchangeRate,
      usageAmount: formatAmount(item.usageAmount, localIso),
      usageUsd: formatAmount(item.usageUsd, "USD"),
      usageUnit: item.usageUnit,
      reconciliationBasis: item.reconciliationBasis,
    };
  });
}

/**
 * Maps parsed Excel report lines to string preview DTOs for upload confirmation UI.
 */
import type { ParsedReportLine } from "@/lib/platform/excel/parse-report";
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

function formatNumber(value: number | null): string | null {
  if (value === null) {
    return null;
  }
  return String(value);
}

export function mapParsedLinesToPreview(
  lines: ParsedReportLine[],
  fx?: ReportFx,
): ReportPreviewLineItem[] {
  const rateToUsd = fx?.rateToUsd ?? null;
  return lines.map((item) => {
    const converted = applyReportFxToAmount(item.amount, rateToUsd);
    return {
      lineNumber: item.lineNumber,
      description: item.description,
      amount: formatNumber(item.amount),
      amountUsd: converted.amountUsd,
      exchangeRate: converted.exchangeRate,
      usageAmount: formatNumber(item.usageAmount),
      usageUsd: formatNumber(item.usageUsd),
      usageUnit: item.usageUnit,
      reconciliationBasis: item.reconciliationBasis,
    };
  });
}

import type { ParsedReportLine } from "@/lib/platform/excel/parse-report";

export type ReportPreviewLineItem = {
  lineNumber: number;
  description: string | null;
  usageAmount: string | null;
  usageUsd: string | null;
  amount: string | null;
  exchangeRate: string | null;
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
): ReportPreviewLineItem[] {
  return lines.map((item) => ({
    lineNumber: item.lineNumber,
    description: item.description,
    usageAmount: formatNumber(item.usageAmount),
    usageUsd: formatNumber(item.usageUsd),
    amount: formatNumber(item.amount),
    exchangeRate: formatNumber(item.exchangeRate),
    usageUnit: item.usageUnit,
    reconciliationBasis: item.reconciliationBasis,
  }));
}

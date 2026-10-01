/**
 * Collapse Partner parsed lines that share a hyphen prefix into one row
 * (sum amounts). Used after Excel parse so upload/preview/reupload stay aligned
 * with reconciliation prefix matching.
 */

import {
  extractServicePrefix,
  normalizeServiceName,
} from "@/lib/dizlee/reconciliation/compare";
import type { ParsedReportLine } from "@/lib/platform/excel/parse-report";

function sumNullable(a: number | null, b: number | null): number | null {
  if (a === null && b === null) {
    return null;
  }
  return (a ?? 0) + (b ?? 0);
}

/**
 * Merge lines with the same service prefix key (spaces ignored).
 * Description becomes the hyphen prefix; numeric amount fields are summed.
 */
export function mergePartnerLinesByServicePrefix(
  lines: ParsedReportLine[],
): ParsedReportLine[] {
  const groups = new Map<string, ParsedReportLine>();
  const order: string[] = [];

  for (const line of lines) {
    const key = normalizeServiceName(line.description, line.lineNumber);
    const existing = groups.get(key);
    if (!existing) {
      const description = line.description?.trim()
        ? extractServicePrefix(line.description)
        : line.description;
      groups.set(key, {
        ...line,
        description,
        sourceColumns: { ...line.sourceColumns },
      });
      order.push(key);
      continue;
    }

    existing.usageAmount = sumNullable(existing.usageAmount, line.usageAmount);
    existing.usageUsd = sumNullable(existing.usageUsd, line.usageUsd);
    existing.amount = sumNullable(existing.amount, line.amount);
    // Keep first row's RS % / FX / unit / currency when already set.
    if (existing.revenueSharePercent === null) {
      existing.revenueSharePercent = line.revenueSharePercent;
    }
    if (existing.exchangeRate === null) {
      existing.exchangeRate = line.exchangeRate;
    }
    if (!existing.usageUnit) {
      existing.usageUnit = line.usageUnit;
    }
    if (!existing.reconciliationBasis) {
      existing.reconciliationBasis = line.reconciliationBasis;
    }
    if (!existing.currencyCode) {
      existing.currencyCode = line.currencyCode;
    }
  }

  return order.map((key, index) => {
    const row = groups.get(key)!;
    return { ...row, lineNumber: index + 1 };
  });
}

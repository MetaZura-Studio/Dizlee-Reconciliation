import { normalizeServiceName } from "@/lib/dizlee/reconciliation/compare";

export type ConsolidationLineInput = {
  lineNumber: number;
  description: string | null;
  usageAmount: number | null;
  usageUsd: number | null;
  amount: number | null;
  exchangeRate: number | null;
  usageUnit: string | null;
  reconciliationBasis: string | null;
  sourceColumns: Record<string, unknown> | null;
};

export type AggregatedConsolidationItem = {
  serviceCode: string;
  description: string;
  usageAmount: number;
  usageUsd: number;
  exchangeRate: number | null;
  usageUnit: string | null;
  revenueBasis: string | null;
};

function lineUsageAmount(line: ConsolidationLineInput): number {
  if (line.usageAmount !== null && line.usageAmount !== undefined) {
    return line.usageAmount;
  }
  if (line.amount !== null && line.amount !== undefined) {
    return line.amount;
  }
  return 0;
}

function lineUsageUsd(line: ConsolidationLineInput): number {
  if (line.usageUsd !== null && line.usageUsd !== undefined) {
    return line.usageUsd;
  }
  return lineUsageAmount(line);
}

export function extractServiceCode(line: ConsolidationLineInput): string {
  const source = line.sourceColumns;
  const candidates = [
    source?.service_code,
    source?.servicecode,
    source?.service,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate.trim().slice(0, 128);
    }
  }

  return normalizeServiceName(line.description, line.lineNumber).slice(0, 128);
}

export function aggregatePartnerLines(
  lines: ConsolidationLineInput[],
): AggregatedConsolidationItem[] {
  const map = new Map<string, AggregatedConsolidationItem>();

  for (const line of lines) {
    const serviceCode = extractServiceCode(line);
    const usageAmount = lineUsageAmount(line);
    const usageUsd = lineUsageUsd(line);
    const existing = map.get(serviceCode);

    if (existing) {
      existing.usageAmount += usageAmount;
      existing.usageUsd += usageUsd;
      if (!existing.description && line.description) {
        existing.description = line.description;
      }
      if (!existing.usageUnit && line.usageUnit) {
        existing.usageUnit = line.usageUnit;
      }
      if (existing.exchangeRate === null && line.exchangeRate !== null) {
        existing.exchangeRate = line.exchangeRate;
      }
      if (!existing.revenueBasis && line.reconciliationBasis) {
        existing.revenueBasis = line.reconciliationBasis;
      }
      continue;
    }

    map.set(serviceCode, {
      serviceCode,
      description:
        line.description?.trim() || serviceCode.slice(0, 255),
      usageAmount,
      usageUsd,
      exchangeRate: line.exchangeRate,
      usageUnit: line.usageUnit,
      revenueBasis: line.reconciliationBasis,
    });
  }

  return [...map.values()].sort((a, b) =>
    a.serviceCode.localeCompare(b.serviceCode),
  );
}

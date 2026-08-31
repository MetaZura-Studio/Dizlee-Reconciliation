/**
 * Stable fingerprint of OpCo partner line items for reupload change detection.
 * Same shape as reconciliation matching cares about (service identity + amounts).
 */

import { normalizeServiceName } from "@/lib/dizlee/reconciliation/compare";

export type FingerprintableLine = {
  description: string | null;
  lineNumber: number;
  amount: number | null;
  usageAmount: number | null;
  usageUsd: number | null;
  revenueSharePercent?: number | null;
  reconciliationBasis?: string | null;
  usageUnit?: string | null;
};

function toFiniteNumber(value: unknown): number | null {
  if (value == null) {
    return null;
  }
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizeAmount(value: unknown): string {
  const n = toFiniteNumber(value);
  if (n == null) {
    return "";
  }
  return n.toFixed(4);
}

function normalizeText(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

/** Canonical sorted payload used for equality checks after OpCo reupload. */
export function fingerprintPartnerLines(lines: FingerprintableLine[]): string {
  const rows = lines.map((line) => ({
    key: normalizeServiceName(line.description, line.lineNumber),
    amount: normalizeAmount(line.amount),
    usageAmount: normalizeAmount(line.usageAmount),
    usageUsd: normalizeAmount(line.usageUsd),
    revenueSharePercent: normalizeAmount(line.revenueSharePercent ?? null),
    basis: normalizeText(line.reconciliationBasis),
    unit: normalizeText(line.usageUnit),
  }));

  rows.sort((a, b) => {
    const byKey = a.key.localeCompare(b.key);
    if (byKey !== 0) {
      return byKey;
    }
    const byAmount = a.amount.localeCompare(b.amount);
    if (byAmount !== 0) {
      return byAmount;
    }
    return a.usageUsd.localeCompare(b.usageUsd);
  });

  return JSON.stringify(rows);
}

export function partnerLinesChanged(
  previous: FingerprintableLine[],
  next: FingerprintableLine[],
): boolean {
  return fingerprintPartnerLines(previous) !== fingerprintPartnerLines(next);
}

/** Map Prisma Decimal / nullish fields into fingerprintable numbers. */
export function linesFromStoredReportItems(
  items: Array<{
    description: string | null;
    lineNumber: number;
    amount: unknown;
    usageAmount: unknown;
    usageUsd: unknown;
    revenueSharePercent?: unknown;
    reconciliationBasis?: string | null;
    usageUnit?: string | null;
  }>,
): FingerprintableLine[] {
  return items.map((item) => ({
    description: item.description,
    lineNumber: item.lineNumber,
    amount: toFiniteNumber(item.amount),
    usageAmount: toFiniteNumber(item.usageAmount),
    usageUsd: toFiniteNumber(item.usageUsd),
    revenueSharePercent: toFiniteNumber(item.revenueSharePercent),
    reconciliationBasis: item.reconciliationBasis ?? null,
    usageUnit: item.usageUnit ?? null,
  }));
}

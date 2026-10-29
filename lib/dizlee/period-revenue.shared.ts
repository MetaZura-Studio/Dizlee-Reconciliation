/**
 * Shared DTOs and pure helpers for Dizlee OpCo–Partner revenue.
 */

import { normalizeServiceName } from "@/lib/dizlee/reconciliation/compare";

export type PeriodRevenueServiceRow = {
  serviceName: string;
  grossLc: number;
  grossUsd: number | null;
};

export type PeriodRevenueReportMeta = {
  reportId: string;
  version: number;
  partnerName: string;
  opcoName: string;
};

export type PeriodRevenueResult = {
  filters: PeriodRevenueFilters;
  currencyCode: string;
  rateToUsd: number | null;
  totalLc: number;
  totalUsd: number | null;
  services: PeriodRevenueServiceRow[];
  report: PeriodRevenueReportMeta | null;
  missingFx: boolean;
};

export type PeriodRevenueFilters = {
  month: number;
  year: number;
  opcoId?: string;
  partnerId?: string;
};

export type PeriodRevenueFilterOptions = {
  opcos: Array<{ id: string; name: string }>;
  /** Partners grouped by OpCo id (active links only). */
  partnersByOpcoId: Record<string, Array<{ id: string; name: string }>>;
};

export type PeriodRevenueLineInput = {
  description: string | null;
  amount: number | null;
  sourceColumns?: unknown;
};

function toFiniteNumber(value: unknown): number | null {
  if (value == null || value === "") {
    return null;
  }
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function serviceNameFromLine(item: PeriodRevenueLineInput): string {
  const source =
    item.sourceColumns && typeof item.sourceColumns === "object"
      ? (item.sourceColumns as Record<string, unknown>)
      : {};
  return (
    item.description?.trim() ||
    String(source.service_name ?? source.servicename ?? "").trim() ||
    "—"
  );
}

/** Aggregate OpCo report lines by full service name; amounts are local currency. */
export function aggregatePeriodRevenueServices(
  lines: PeriodRevenueLineInput[],
  rateToUsd: number | null,
): {
  services: PeriodRevenueServiceRow[];
  totalLc: number;
  totalUsd: number | null;
} {
  const map = new Map<string, { serviceName: string; grossLc: number }>();

  lines.forEach((line, index) => {
    const serviceName = serviceNameFromLine(line);
    const key = normalizeServiceName(serviceName, index + 1);
    const amount = toFiniteNumber(line.amount) ?? 0;
    const existing = map.get(key);
    if (existing) {
      existing.grossLc += amount;
      return;
    }
    map.set(key, { serviceName, grossLc: amount });
  });

  const hasFx =
    rateToUsd !== null && Number.isFinite(rateToUsd) && rateToUsd > 0;

  const services = [...map.values()]
    .sort((a, b) => a.serviceName.localeCompare(b.serviceName))
    .map((row) => ({
      serviceName: row.serviceName,
      grossLc: row.grossLc,
      grossUsd: hasFx ? row.grossLc * (rateToUsd as number) : null,
    }));

  const totalLc = services.reduce((sum, row) => sum + row.grossLc, 0);
  const totalUsd = hasFx ? totalLc * (rateToUsd as number) : null;

  return { services, totalLc, totalUsd };
}

export function parsePeriodRevenueFilters(
  params: URLSearchParams | { get(name: string): string | null },
): PeriodRevenueFilters {
  const now = new Date();
  const monthRaw = Number.parseInt(params.get("month") ?? "", 10);
  const yearRaw = Number.parseInt(params.get("year") ?? "", 10);
  const month =
    Number.isInteger(monthRaw) && monthRaw >= 1 && monthRaw <= 12
      ? monthRaw
      : now.getMonth() + 1;
  const year =
    Number.isInteger(yearRaw) && yearRaw >= 2000 && yearRaw <= 2100
      ? yearRaw
      : now.getFullYear();
  const opcoId = params.get("opcoId")?.trim() || undefined;
  const partnerId = params.get("partnerId")?.trim() || undefined;
  return {
    month,
    year,
    opcoId: opcoId && /^\d+$/.test(opcoId) ? opcoId : undefined,
    partnerId: partnerId && /^\d+$/.test(partnerId) ? partnerId : undefined,
  };
}

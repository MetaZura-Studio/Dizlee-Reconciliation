/**
 * Per-OpCo Service/Application → Partner mapping helpers.
 * Used when OpCo report Partner mode is SERVICE_PARTNER_MAP.
 */

export function normalizeServiceKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function compactPartnerKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export type ServiceMapRowLike = {
  serviceKey: string;
  serviceName?: string | null;
};

/**
 * Match a report service to a map row. "Premium Games" and "PremiumGames"
 * are the same key (letters/digits only).
 */
export function matchServiceMapRow<T extends ServiceMapRowLike>(
  line: { serviceKey: string; serviceName: string },
  maps: T[],
): T | null {
  const exact = maps.find((row) => row.serviceKey === line.serviceKey);
  if (exact) {
    return exact;
  }

  const compact =
    compactPartnerKey(line.serviceName) || compactPartnerKey(line.serviceKey);
  if (!compact) {
    return null;
  }

  return (
    maps.find((row) => {
      const rowCompact =
        compactPartnerKey(row.serviceName ?? "") ||
        compactPartnerKey(row.serviceKey);
      return rowCompact === compact;
    }) ?? null
  );
}

/** Match Excel Partner text to a linked Partner (spaces, punctuation, prefix/suffix). */
export function matchLinkedPartner<T extends { name: string }>(
  excelName: string,
  linked: T[],
): T | null {
  const key = normalizeServiceKey(excelName);
  const exact = linked.find((partner) => normalizeServiceKey(partner.name) === key);
  if (exact) {
    return exact;
  }

  const excelCompact = compactPartnerKey(excelName);
  if (!excelCompact) {
    return null;
  }

  const compactExact = linked.find(
    (partner) => compactPartnerKey(partner.name) === excelCompact,
  );
  if (compactExact) {
    return compactExact;
  }

  const contains = linked
    .filter((partner) => {
      const partnerCompact = compactPartnerKey(partner.name);
      if (partnerCompact.length < 4) {
        return false;
      }
      return (
        excelCompact.includes(partnerCompact) ||
        partnerCompact.includes(excelCompact)
      );
    })
    .sort(
      (left, right) =>
        compactPartnerKey(right.name).length - compactPartnerKey(left.name).length,
    );
  return contains[0] ?? null;
}

export type ResolvedServicePartnerLine = {
  serviceKey: string;
  serviceName: string;
  description: string | null;
  amount: number | null;
  revenueSharePercent: number | null;
  lineNumber: number;
  sourceColumns: Record<string, string | number | null>;
};

export type PartnerColumnLine = ResolvedServicePartnerLine & {
  partnerName: string;
  partnerKey: string;
};

export type PartnerLineGroup<T extends ResolvedServicePartnerLine> = {
  partnerId: bigint;
  lines: T[];
};

/**
 * Aggregate Sudan-style daily rows: sum amount by serviceKey (+ description).
 */
export function aggregateLinesByDescription<T extends ResolvedServicePartnerLine>(
  lines: T[],
): T[] {
  const buckets = new Map<string, T>();

  for (const line of lines) {
    const descKey = normalizeServiceKey(line.description ?? line.serviceName);
    const bucketKey = `${line.serviceKey}::${descKey}`;
    const existing = buckets.get(bucketKey);
    if (!existing) {
      buckets.set(bucketKey, { ...line });
      continue;
    }
    const nextAmount = (existing.amount ?? 0) + (line.amount ?? 0);
    buckets.set(bucketKey, {
      ...existing,
      amount: nextAmount,
      sourceColumns: {
        ...existing.sourceColumns,
        aggregated: true,
      },
    });
  }

  return [...buckets.values()].map((line, index) => ({
    ...line,
    lineNumber: index + 1,
  }));
}

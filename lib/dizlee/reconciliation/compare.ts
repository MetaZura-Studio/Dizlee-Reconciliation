/**
 * Pure line-matching logic for OpCo vs partner report reconciliation runs.
 * Consumed by reconciliation runs (shared service keys).
 * Service identity is normalized description text, not raw line numbers alone.
 */

export type CompareLineInput = {
  lineId: bigint;
  description: string | null;
  lineNumber: number;
  usageUsd: number | null;
  usageAmount: number | null;
  amount: number | null;
};

export type ComparedRow = {
  serviceCode: string;
  description: string | null;
  opcoLineItemId: bigint | null;
  partnerLineItemId: bigint | null;
  opcoAmount: number | null;
  partnerAmount: number | null;
  varianceAmount: number | null;
  confirmedValue: number | null;
  matchStatus:
    | "MATCHED"
    | "MISMATCHED"
    | "MISSING_IN_PARTNER"
    | "MISSING_IN_OPCO";
};

/**
 * Text before the first hyphen (optional spaces around `-`).
 * "FIFA Tutorials - GBOnline" → "FIFA Tutorials"; "GameZilla-GBOnline" → "GameZilla".
 */
export function extractServicePrefix(description: string): string {
  const trimmed = description.trim();
  if (!trimmed) {
    return trimmed;
  }
  return trimmed.split(/\s*-\s*/, 2)[0]?.trim() || trimmed;
}

/** Canonical service key: hyphen prefix, then lowercase with spaces stripped. */
export function normalizeServiceName(
  description: string | null,
  lineNumber: number,
): string {
  const raw = description?.trim() || `line-${lineNumber}`;
  const base = extractServicePrefix(raw).toLowerCase();
  return base.replace(/\s+/g, "");
}

/** Prefer billable amount. Callers pass USD (OpCo local converted; Partner usageUsd or amount). */
export function lineAmountUsd(line: CompareLineInput): number {
  if (line.amount !== null && line.amount !== undefined) {
    return line.amount;
  }
  if (line.usageUsd !== null && line.usageUsd !== undefined) {
    return line.usageUsd;
  }
  if (line.usageAmount !== null && line.usageAmount !== undefined) {
    return line.usageAmount;
  }
  return 0;
}

export function withinTolerance(
  opcoAmount: number,
  partnerAmount: number,
  tolerancePercent: number,
): boolean {
  const max = Math.max(Math.abs(opcoAmount), Math.abs(partnerAmount));
  if (max === 0) {
    return true;
  }
  const diff = Math.abs(opcoAmount - partnerAmount);
  return (diff / max) * 100 <= tolerancePercent;
}

type AggregatedSide = {
  amount: number;
  lineId: bigint;
  description: string | null;
};

function aggregateLines(
  lines: CompareLineInput[],
): Map<string, AggregatedSide> {
  const map = new Map<string, AggregatedSide>();

  for (const line of lines) {
    const serviceCode = normalizeServiceName(line.description, line.lineNumber);
    const amount = lineAmountUsd(line);
    const displayDescription = line.description?.trim()
      ? extractServicePrefix(line.description)
      : line.description;
    const existing = map.get(serviceCode);

    if (existing) {
      existing.amount += amount;
    } else {
      map.set(serviceCode, {
        amount,
        lineId: line.lineId,
        description: displayDescription,
      });
    }
  }

  return map;
}

/** Pairwise line comparison with tolerance-based MATCHED vs MISMATCHED classification. */
export function compareReportLines(
  opcoLines: CompareLineInput[],
  partnerLines: CompareLineInput[],
  tolerancePercent: number,
): ComparedRow[] {
  const opcoByService = aggregateLines(opcoLines);
  const partnerByService = aggregateLines(partnerLines);
  const serviceCodes = new Set([
    ...opcoByService.keys(),
    ...partnerByService.keys(),
  ]);

  const rows: ComparedRow[] = [];

  for (const serviceCode of [...serviceCodes].sort()) {
    const opco = opcoByService.get(serviceCode);
    const partner = partnerByService.get(serviceCode);

    if (opco && partner) {
      const variance = opco.amount - partner.amount;
      const matched = withinTolerance(
        opco.amount,
        partner.amount,
        tolerancePercent,
      );

      rows.push({
        serviceCode,
        description: opco.description ?? partner.description,
        opcoLineItemId: opco.lineId,
        partnerLineItemId: partner.lineId,
        opcoAmount: opco.amount,
        partnerAmount: partner.amount,
        varianceAmount: variance,
        confirmedValue: Math.min(opco.amount, partner.amount),
        matchStatus: matched ? "MATCHED" : "MISMATCHED",
      });
    } else if (opco) {
      rows.push({
        serviceCode,
        description: opco.description,
        opcoLineItemId: opco.lineId,
        partnerLineItemId: null,
        opcoAmount: opco.amount,
        partnerAmount: null,
        varianceAmount: null,
        confirmedValue: opco.amount,
        matchStatus: "MISSING_IN_PARTNER",
      });
    } else if (partner) {
      rows.push({
        serviceCode,
        description: partner.description,
        opcoLineItemId: null,
        partnerLineItemId: partner.lineId,
        opcoAmount: null,
        partnerAmount: partner.amount,
        varianceAmount: null,
        confirmedValue: null,
        matchStatus: "MISSING_IN_OPCO",
      });
    }
  }

  return rows;
}

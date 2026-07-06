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

export function normalizeServiceName(
  description: string | null,
  lineNumber: number,
): string {
  const base = (description?.trim() || `line-${lineNumber}`).toLowerCase();
  return base.replace(/\s+/g, " ");
}

export function lineAmountUsd(line: CompareLineInput): number {
  if (line.usageUsd !== null && line.usageUsd !== undefined) {
    return line.usageUsd;
  }
  if (line.usageAmount !== null && line.usageAmount !== undefined) {
    return line.usageAmount;
  }
  if (line.amount !== null && line.amount !== undefined) {
    return line.amount;
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
    const existing = map.get(serviceCode);

    if (existing) {
      existing.amount += amount;
    } else {
      map.set(serviceCode, {
        amount,
        lineId: line.lineId,
        description: line.description,
      });
    }
  }

  return map;
}

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
        confirmedValue: opco.amount,
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

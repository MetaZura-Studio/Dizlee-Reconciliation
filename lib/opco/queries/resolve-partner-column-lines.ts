/**
 * Resolve Excel Partner-column values to linked Partners and group line items.
 */
import type { ParsedReportLine } from "@/lib/opco/excel/parse-report";
import { getLinkedPartnersForOpco } from "@/lib/opco/queries/partners";
import type { PartnerResolvedBucket } from "@/lib/opco/queries/resolve-service-partner-maps";
import {
  matchLinkedPartner,
  type PartnerColumnLine,
} from "@/lib/platform/service-partner-map";

export class PartnerColumnResolveError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "PartnerColumnResolveError";
    this.status = status;
  }
}

function toParsedLines(lines: PartnerColumnLine[]): ParsedReportLine[] {
  return lines.map((line, index) => ({
    lineNumber: index + 1,
    description: line.description,
    usageAmount: null,
    usageUsd: null,
    amount: line.amount,
    revenueSharePercent: line.revenueSharePercent,
    exchangeRate: null,
    usageUnit: null,
    reconciliationBasis: null,
    sourceColumns: line.sourceColumns,
  }));
}

export async function resolvePartnerColumnLinesToBuckets(params: {
  opcoId: bigint;
  lines: PartnerColumnLine[];
}): Promise<PartnerResolvedBucket[]> {
  const linked = await getLinkedPartnersForOpco(params.opcoId);
  const linkedRefs = linked.map((partner) => ({
    id: BigInt(partner.id),
    name: partner.name,
  }));

  const byPartner = new Map<
    string,
    { partnerId: bigint; partnerName: string; lines: PartnerColumnLine[] }
  >();

  for (const line of params.lines) {
    const partner = matchLinkedPartner(line.partnerName, linkedRefs);
    if (!partner) {
      continue;
    }
    const key = partner.id.toString();
    const existing = byPartner.get(key);
    if (existing) {
      existing.lines.push(line);
    } else {
      byPartner.set(key, {
        partnerId: partner.id,
        partnerName: partner.name,
        lines: [line],
      });
    }
  }

  if (byPartner.size === 0) {
    throw new PartnerColumnResolveError(
      "No rows matched a Partner linked to this OpCo. Check the Partner column against Admin OpCo–Partner links.",
      400,
    );
  }

  return [...byPartner.values()].map((bucket) => ({
    partnerId: bucket.partnerId,
    partnerName: bucket.partnerName,
    lineItems: toParsedLines(bucket.lines),
  }));
}

/**
 * Resolve Service/Application keys to Partners and group OpCo line items.
 */
import type { ParsedReportLine } from "@/lib/opco/excel/parse-report";
import { isPartnerLinkedToOpco } from "@/lib/opco/queries/partners";
import {
  matchLinkedPartner,
  matchServiceMapRow,
  type ResolvedServicePartnerLine,
} from "@/lib/platform/service-partner-map";
import { prisma } from "@/lib/prisma";

export class ServicePartnerResolveError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "ServicePartnerResolveError";
    this.status = status;
  }
}

export type PartnerResolvedBucket = {
  partnerId: bigint;
  partnerName: string;
  lineItems: ParsedReportLine[];
};

function resolveLinePartner(params: {
  line: ResolvedServicePartnerLine;
  maps: Array<{
    serviceKey: string;
    serviceName: string;
    partnerId: bigint;
    partner: { name: string; isDeleted: boolean };
  }>;
  allPartners: Array<{ id: bigint; name: string }>;
}): { partnerId: bigint; partnerName: string } | null {
  const mapped = matchServiceMapRow(params.line, params.maps);
  if (mapped && !mapped.partner.isDeleted) {
    return { partnerId: mapped.partnerId, partnerName: mapped.partner.name };
  }

  const partner = matchLinkedPartner(params.line.serviceName, params.allPartners);
  if (partner) {
    return { partnerId: partner.id, partnerName: partner.name };
  }

  return null;
}

export async function resolveLookupLinesToPartnerBuckets(params: {
  opcoId: bigint;
  lines: ResolvedServicePartnerLine[];
}): Promise<PartnerResolvedBucket[]> {
  const [maps, allPartners] = await Promise.all([
    prisma.servicePartnerMap.findMany({
      where: {
        isDeleted: false,
        opcoId: params.opcoId,
      },
      select: {
        serviceKey: true,
        serviceName: true,
        partnerId: true,
        partner: { select: { name: true, isDeleted: true } },
      },
    }),
    prisma.partner.findMany({
      where: { isDeleted: false },
      select: { id: true, name: true },
    }),
  ]);

  const unmappedNames: string[] = [];
  const resolved: Array<{
    line: ResolvedServicePartnerLine;
    partnerId: bigint;
    partnerName: string;
  }> = [];

  for (const line of params.lines) {
    const partner = resolveLinePartner({ line, maps, allPartners });
    if (!partner) {
      unmappedNames.push(line.serviceName);
      continue;
    }
    resolved.push({ line, ...partner });
  }

  if (unmappedNames.length > 0) {
    const uniqueNames = [...new Set(unmappedNames)];
    throw new ServicePartnerResolveError(
      `No Service–Partner mapping for: ${uniqueNames.join(", ")}`,
      400,
    );
  }

  const byPartner = new Map<
    string,
    { partnerId: bigint; partnerName: string; lines: ResolvedServicePartnerLine[] }
  >();

  for (const row of resolved) {
    const partnerKey = row.partnerId.toString();
    const existing = byPartner.get(partnerKey);
    if (existing) {
      existing.lines.push(row.line);
    } else {
      byPartner.set(partnerKey, {
        partnerId: row.partnerId,
        partnerName: row.partnerName,
        lines: [row.line],
      });
    }
  }

  const buckets: PartnerResolvedBucket[] = [];

  for (const bucket of byPartner.values()) {
    const linked = await isPartnerLinkedToOpco(params.opcoId, bucket.partnerId);
    if (!linked) {
      throw new ServicePartnerResolveError(
        `Partner "${bucket.partnerName}" is not linked to this OpCo`,
        403,
      );
    }

    buckets.push({
      partnerId: bucket.partnerId,
      partnerName: bucket.partnerName,
      lineItems: bucket.lines.map((line, index) => ({
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
      })),
    });
  }

  return buckets;
}

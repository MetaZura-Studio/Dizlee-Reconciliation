/**
 * Resolve Service/Application keys to Partners and group OpCo line items.
 */
import type { ParsedReportLine } from "@/lib/opco/excel/parse-report";
import { isPartnerLinkedToOpco } from "@/lib/opco/queries/partners";
import type { ResolvedServicePartnerLine } from "@/lib/platform/service-partner-map";
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

export async function resolveLookupLinesToPartnerBuckets(params: {
  opcoId: bigint;
  lines: ResolvedServicePartnerLine[];
}): Promise<PartnerResolvedBucket[]> {
  const keys = [...new Set(params.lines.map((line) => line.serviceKey))];
  const maps = await prisma.servicePartnerMap.findMany({
    where: {
      isDeleted: false,
      serviceKey: { in: keys },
    },
    select: {
      serviceKey: true,
      partnerId: true,
      partner: { select: { name: true, isDeleted: true } },
    },
  });

  const mapByKey = new Map(
    maps.map((row) => [row.serviceKey, row]),
  );

  const unmapped = keys.filter((key) => !mapByKey.has(key));
  if (unmapped.length > 0) {
    const samples = params.lines
      .filter((line) => unmapped.includes(line.serviceKey))
      .map((line) => line.serviceName);
    const uniqueNames = [...new Set(samples)];
    throw new ServicePartnerResolveError(
      `No Service–Partner mapping for: ${uniqueNames.join(", ")}`,
      400,
    );
  }

  const byPartner = new Map<
    string,
    { partnerId: bigint; partnerName: string; lines: ResolvedServicePartnerLine[] }
  >();

  for (const line of params.lines) {
    const mapped = mapByKey.get(line.serviceKey);
    if (!mapped || mapped.partner.isDeleted) {
      throw new ServicePartnerResolveError(
        `Partner mapping invalid for "${line.serviceName}"`,
        400,
      );
    }

    const partnerKey = mapped.partnerId.toString();
    const existing = byPartner.get(partnerKey);
    if (existing) {
      existing.lines.push(line);
    } else {
      byPartner.set(partnerKey, {
        partnerId: mapped.partnerId,
        partnerName: mapped.partner.name,
        lines: [line],
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

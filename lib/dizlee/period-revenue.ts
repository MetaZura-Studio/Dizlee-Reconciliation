/**
 * Dizlee OpCo–Partner revenue from the latest OpCo-uploaded report.
 */

import "server-only";

import { DomainError } from "@/lib/errors/app-error";
import {
  aggregatePeriodRevenueServices,
  type PeriodRevenueFilterOptions,
  type PeriodRevenueFilters,
  type PeriodRevenueResult,
} from "@/lib/dizlee/period-revenue.shared";
import { ACTIVE_OPCO_PARTNER_LINK_FILTER } from "@/lib/platform/opco-partner-links";
import { getOpcoReportFx } from "@/lib/platform/report-fx";
import { prisma } from "@/lib/prisma";

export type {
  PeriodRevenueFilterOptions,
  PeriodRevenueFilters,
  PeriodRevenueResult,
  PeriodRevenueServiceRow,
} from "@/lib/dizlee/period-revenue.shared";
export {
  aggregatePeriodRevenueServices,
  parsePeriodRevenueFilters,
} from "@/lib/dizlee/period-revenue.shared";

export class PeriodRevenueError extends DomainError {
  constructor(keyOrMessage: string, status?: number) {
    super("PeriodRevenueError", keyOrMessage, status);
  }
}

export async function getPeriodRevenueFilterOptions(): Promise<PeriodRevenueFilterOptions> {
  const [opcos, links] = await Promise.all([
    prisma.opco.findMany({
      where: { isDeleted: false },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.opcoPartnerLink.findMany({
      where: ACTIVE_OPCO_PARTNER_LINK_FILTER,
      orderBy: { partner: { name: "asc" } },
      select: {
        opcoId: true,
        partner: { select: { id: true, name: true } },
      },
    }),
  ]);

  const partnersByOpcoId: PeriodRevenueFilterOptions["partnersByOpcoId"] = {};
  for (const link of links) {
    const opcoId = link.opcoId.toString();
    const list = partnersByOpcoId[opcoId] ?? [];
    list.push({
      id: link.partner.id.toString(),
      name: link.partner.name,
    });
    partnersByOpcoId[opcoId] = list;
  }

  return {
    opcos: opcos.map((row) => ({
      id: row.id.toString(),
      name: row.name,
    })),
    partnersByOpcoId,
  };
}

/**
 * Gross revenue for one OpCo + Partner + month from the latest OpCo report.
 * Returns empty services when filters are incomplete or no report exists.
 */
export async function getPeriodRevenue(
  filters: PeriodRevenueFilters,
): Promise<PeriodRevenueResult> {
  const { month, year, opcoId, partnerId } = filters;

  if (!opcoId || !partnerId) {
    return {
      filters,
      currencyCode: "USD",
      rateToUsd: null,
      totalLc: 0,
      totalUsd: null,
      services: [],
      report: null,
      missingFx: false,
    };
  }

  const opcoIdBig = BigInt(opcoId);
  const partnerIdBig = BigInt(partnerId);

  const [opco, partner, link, report, fx] = await Promise.all([
    prisma.opco.findFirst({
      where: { id: opcoIdBig, isDeleted: false },
      select: { id: true, name: true },
    }),
    prisma.partner.findFirst({
      where: { id: partnerIdBig, isDeleted: false },
      select: { id: true, name: true },
    }),
    prisma.opcoPartnerLink.findFirst({
      where: {
        opcoId: opcoIdBig,
        partnerId: partnerIdBig,
        ...ACTIVE_OPCO_PARTNER_LINK_FILTER,
      },
      select: { opcoId: true },
    }),
    prisma.report.findFirst({
      where: {
        opcoId: opcoIdBig,
        partnerId: partnerIdBig,
        month,
        year,
        isDeleted: false,
        uploadedByUser: { role: { code: "OPCO" } },
      },
      orderBy: { version: "desc" },
      select: {
        id: true,
        version: true,
        lineItems: {
          where: { isDeleted: false },
          select: {
            description: true,
            amount: true,
            sourceColumns: true,
          },
        },
      },
    }),
    getOpcoReportFx({ opcoId: opcoIdBig, month, year }),
  ]);

  if (!opco) {
    throw new PeriodRevenueError("OpCo not found.", 404);
  }
  if (!partner) {
    throw new PeriodRevenueError("Partner not found.", 404);
  }
  if (!link) {
    throw new PeriodRevenueError("Partner is not linked to this OpCo.", 400);
  }

  const rateToUsd = fx.rateToUsd;
  const missingFx = rateToUsd === null;

  if (!report) {
    return {
      filters,
      currencyCode: fx.currencyCode,
      rateToUsd,
      totalLc: 0,
      totalUsd: null,
      services: [],
      report: null,
      missingFx,
    };
  }

  const aggregated = aggregatePeriodRevenueServices(
    report.lineItems.map((item) => ({
      description: item.description,
      amount:
        item.amount == null
          ? null
          : typeof item.amount === "number"
            ? item.amount
            : Number(item.amount),
      sourceColumns: item.sourceColumns,
    })),
    rateToUsd,
  );

  return {
    filters,
    currencyCode: fx.currencyCode,
    rateToUsd,
    totalLc: aggregated.totalLc,
    totalUsd: aggregated.totalUsd,
    services: aggregated.services,
    report: {
      reportId: report.id.toString(),
      version: report.version,
      partnerName: partner.name,
      opcoName: opco.name,
    },
    missingFx,
  };
}

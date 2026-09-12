/**
 * Monthly period scorecard for Dizlee Reporting: OpCo rollup for the selected period.
 * Pair-level chase stays on Reports / Invoice monitoring and Reconciliation.
 */

import { currentPeriod, type DashboardPeriod } from "@/lib/dizlee/dashboard";
import {
  getReportFilterOptions,
  type ReportFilterOptions,
} from "@/lib/dizlee/reports";
import { formatAppMonthYear } from "@/lib/platform/format-datetime";
import { getMonthlyRatesForPeriod } from "@/lib/platform/currency-rates";
import { ACTIVE_OPCO_PARTNER_LINK_FILTER } from "@/lib/platform/opco-partner-links";
import { prisma } from "@/lib/prisma";

export type ReportingFilters = {
  month: number;
  year: number;
  opcoId?: string;
};

export type ReportingOpcoRow = {
  opcoId: string;
  opcoName: string;
  partnerCount: number;
  opcoReport: boolean;
  partnerReportsReceived: number;
  partnerReportsExpected: number;
  reconciliationsDone: number;
  reconciliationsExpected: number;
  reconciliationsMatched: number;
  opcoInvoice: boolean;
  partnerInvoicesReceived: number;
  partnerInvoicesExpected: number;
  rsGenerated: boolean;
  revenueInvoicedUsd: number | null;
  revenuePaidUsd: number | null;
};

export type ReportingOverview = {
  period: DashboardPeriod;
  filters: ReportingFilters;
  opcos: ReportingOpcoRow[];
};

function periodFromParts(month: number, year: number): DashboardPeriod {
  return {
    month,
    year,
    label: formatAppMonthYear(month, year),
  };
}

function toNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function invoiceAmount(items: { lineTotal: unknown }[]): number {
  return items.reduce((sum, item) => sum + toNumber(item.lineTotal), 0);
}

function isReconciliationMatched(
  statusCode: string,
  unmatchedCount: number | null,
): boolean {
  return statusCode === "COMPLETED" && (unmatchedCount ?? 0) === 0;
}

export function parseReportingFilters(
  searchParams: URLSearchParams,
): ReportingFilters {
  const fallback = currentPeriod();
  const month = Number(searchParams.get("month"));
  const year = Number(searchParams.get("year"));

  return {
    month:
      Number.isInteger(month) && month >= 1 && month <= 12 ? month : fallback.month,
    year:
      Number.isInteger(year) && year >= 2000 && year <= 2100 ? year : fallback.year,
    opcoId: searchParams.get("opcoId") || undefined,
  };
}

export async function getReportingOverview(
  filters: ReportingFilters,
): Promise<ReportingOverview> {
  const period = periodFromParts(filters.month, filters.year);
  const { month, year } = filters;

  const linkWhere: { opcoId?: bigint } = {};
  if (filters.opcoId) {
    linkWhere.opcoId = BigInt(filters.opcoId);
  }

  const periodWhere = {
    month,
    year,
    ...(filters.opcoId ? { opcoId: BigInt(filters.opcoId) } : {}),
  };

  const [
    links,
    reports,
    invoices,
    reconciliations,
    opcoSubmissions,
    rsReports,
    fxRates,
  ] = await Promise.all([
    prisma.opcoPartnerLink.findMany({
      where: { ...linkWhere, ...ACTIVE_OPCO_PARTNER_LINK_FILTER },
      orderBy: [{ opco: { name: "asc" } }, { partner: { name: "asc" } }],
      include: {
        opco: { select: { id: true, name: true } },
        partner: { select: { id: true, name: true } },
      },
    }),
    prisma.report.findMany({
      where: { ...periodWhere, isDeleted: false },
      include: {
        uploadedByUser: { select: { role: { select: { code: true } } } },
      },
    }),
    prisma.invoice.findMany({
      where: {
        month,
        year,
        isDeleted: false,
      },
      include: {
        items: { select: { lineTotal: true } },
        invoiceType: { select: { code: true } },
        paymentStatus: { select: { code: true } },
      },
    }),
    prisma.reconciliation.findMany({
      where: { ...periodWhere, isDeleted: false },
      include: {
        status: { select: { code: true } },
      },
    }),
    prisma.opcoReportSubmission.findMany({
      where: { ...periodWhere, isDeleted: false },
      select: { opcoId: true },
    }),
    prisma.revenueShareReport.findMany({
      where: { ...periodWhere, isDeleted: false },
      select: { opcoId: true },
    }),
    getMonthlyRatesForPeriod(month, year),
  ]);

  const fxByCurrency = new Map(
    fxRates.map((rate) => [rate.currencyId, rate.rateToUsd] as const),
  );

  const linkKeys = new Set(
    links.map((link) => `${link.opcoId.toString()}-${link.partnerId.toString()}`),
  );

  const opcosWithReport = new Set(
    opcoSubmissions.map((row) => row.opcoId.toString()),
  );
  const partnerReportLanes = new Set<string>();
  for (const report of reports) {
    const laneKey = `${report.opcoId.toString()}-${report.partnerId.toString()}`;
    if (!linkKeys.has(laneKey)) {
      continue;
    }
    const role = report.uploadedByUser?.role?.code;
    if (role === "OPCO") {
      opcosWithReport.add(report.opcoId.toString());
    } else if (role === "PARTNER") {
      partnerReportLanes.add(laneKey);
    }
  }

  const opcosWithInvoice = new Set<string>();
  const partnersWithInvoice = new Set<string>();
  const invoicedUsdByOpco = new Map<string, number>();
  const paidUsdByOpco = new Map<string, number>();

  for (const invoice of invoices) {
    const typeCode = invoice.invoiceType.code;
    const amount = invoiceAmount(invoice.items);
    const rate = fxByCurrency.get(invoice.currencyId.toString());
    const usd = rate !== undefined ? amount * rate : null;
    const isPaid = invoice.paymentStatus?.code === "PAID";

    if (typeCode === "CLIENT_TO_OPCO" && invoice.opcoId) {
      const opcoId = invoice.opcoId.toString();
      opcosWithInvoice.add(opcoId);
      if (usd !== null) {
        invoicedUsdByOpco.set(
          opcoId,
          (invoicedUsdByOpco.get(opcoId) ?? 0) + usd,
        );
        if (isPaid) {
          paidUsdByOpco.set(opcoId, (paidUsdByOpco.get(opcoId) ?? 0) + usd);
        }
      }
    } else if (typeCode === "PARTNER_TO_CLIENT" && invoice.partnerId) {
      partnersWithInvoice.add(invoice.partnerId.toString());
    }
  }

  const reconByLane = new Map<
    string,
    { statusCode: string; unmatchedCount: number | null }
  >();
  for (const row of reconciliations) {
    const laneKey = `${row.opcoId.toString()}-${row.partnerId.toString()}`;
    if (!reconByLane.has(laneKey)) {
      reconByLane.set(laneKey, {
        statusCode: row.status.code,
        unmatchedCount: row.unmatchedCount,
      });
    }
  }

  const rsByOpco = new Set(rsReports.map((row) => row.opcoId.toString()));

  type Acc = {
    opcoId: string;
    opcoName: string;
    partners: Array<{ partnerId: string; partnerName: string; laneKey: string }>;
  };
  const byOpco = new Map<string, Acc>();
  for (const link of links) {
    const opcoId = link.opco.id.toString();
    const existing = byOpco.get(opcoId) ?? {
      opcoId,
      opcoName: link.opco.name,
      partners: [],
    };
    existing.partners.push({
      partnerId: link.partner.id.toString(),
      partnerName: link.partner.name,
      laneKey: `${link.opcoId.toString()}-${link.partnerId.toString()}`,
    });
    byOpco.set(opcoId, existing);
  }

  const opcos: ReportingOpcoRow[] = [...byOpco.values()]
    .map((acc) => {
      const partnerReportsReceived = acc.partners.filter((p) =>
        partnerReportLanes.has(p.laneKey),
      ).length;
      const reconciliationsDone = acc.partners.filter((p) =>
        reconByLane.has(p.laneKey),
      ).length;
      const reconciliationsMatched = acc.partners.filter((p) => {
        const recon = reconByLane.get(p.laneKey);
        return (
          recon != null &&
          isReconciliationMatched(recon.statusCode, recon.unmatchedCount)
        );
      }).length;
      const partnerInvoicesReceived = acc.partners.filter((p) =>
        partnersWithInvoice.has(p.partnerId),
      ).length;
      const expected = acc.partners.length;
      const invoicedUsd = invoicedUsdByOpco.get(acc.opcoId);
      const paidUsd = paidUsdByOpco.get(acc.opcoId);

      return {
        opcoId: acc.opcoId,
        opcoName: acc.opcoName,
        partnerCount: expected,
        opcoReport: opcosWithReport.has(acc.opcoId),
        partnerReportsReceived,
        partnerReportsExpected: expected,
        reconciliationsDone,
        reconciliationsExpected: expected,
        reconciliationsMatched,
        opcoInvoice: opcosWithInvoice.has(acc.opcoId),
        partnerInvoicesReceived,
        partnerInvoicesExpected: expected,
        rsGenerated: rsByOpco.has(acc.opcoId),
        revenueInvoicedUsd: invoicedUsd ?? null,
        revenuePaidUsd: paidUsd ?? null,
      };
    })
    .sort((a, b) => a.opcoName.localeCompare(b.opcoName));

  return {
    period,
    filters,
    opcos,
  };
}

export { getReportFilterOptions, type ReportFilterOptions };

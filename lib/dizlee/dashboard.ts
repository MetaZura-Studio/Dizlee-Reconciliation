import { ACTIVE_OPCO_PARTNER_LINK_FILTER } from "@/lib/platform/opco-partner-links";
import { getMonthlyRatesForPeriod } from "@/lib/platform/currency-rates";
import { prisma } from "@/lib/prisma";

export type DashboardPeriod = {
  month: number;
  year: number;
  label: string;
};

export type DonutSegment = {
  id?: string;
  label: string;
  value: number;
};

export type BillingKpis = {
  invoices: number;
  totalRevenuePaidUsd: number;
  invoicesPaid: number;
  pendingCollectionUsd: number;
  missingFxCount: number;
};

export type DirectionPanel = {
  linked: number;
  invoiced: number;
  paid: number;
  missingNames: string[];
};

export type BillingSection = {
  kpis: BillingKpis;
  revenueByOpco: DonutSegment[];
  paymentStatus: DonutSegment[];
  sentToOpcos: DirectionPanel;
  receivedFromPartners: DirectionPanel;
};

export type ReconciliationLaneStatus =
  | "Matched"
  | "In Progress"
  | "Mismatches Found"
  | "Pending";

export type ReconciliationLane = {
  id: number;
  lane: string;
  status: ReconciliationLaneStatus;
  matchRate: number;
};

export type ReportsReconSection = {
  reportsSubmitted: number;
  opcoReportsMissing: number;
  partnerReportsMissing: number;
  latestUpload: string | null;
  reportsByOpco: DonutSegment[];
  reportsByPartner: DonutSegment[];
  reconciliation: ReconciliationLane[];
};

export type RecentUpload = {
  id: string;
  actorRole: string;
  lane: string;
  uploadedAt: string;
};

export type DashboardData = {
  period: DashboardPeriod;
  billing: BillingSection;
  reportsRecon: ReportsReconSection;
  recentUploads: RecentUpload[];
};

function periodLabel(month: number, year: number): string {
  return new Date(year, month - 1, 1).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });
}

export function currentPeriod(now = new Date()): DashboardPeriod {
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  return { month, year, label: periodLabel(month, year) };
}

function toNumber(value: unknown): number {
  if (value === null || value === undefined) {
    return 0;
  }
  return Number(value as never);
}

function pushSegment(map: Map<string, number>, label: string, value: number) {
  map.set(label, (map.get(label) ?? 0) + value);
}

function pushNamedSegment(
  map: Map<string, DonutSegment>,
  id: string,
  label: string,
  value: number,
) {
  const existing = map.get(id);
  if (existing) {
    existing.value += value;
  } else {
    map.set(id, { id, label, value });
  }
}

function mapToSegments(map: Map<string, number>): DonutSegment[] {
  return [...map.entries()]
    .filter(([, value]) => value > 0)
    .map(([label, value]) => ({ id: label, label, value }))
    .sort((a, b) => b.value - a.value);
}

function namedMapToSegments(map: Map<string, DonutSegment>): DonutSegment[] {
  return [...map.values()]
    .filter((segment) => segment.value > 0)
    .sort((a, b) => b.value - a.value);
}

function reconciliationLaneStatus(
  statusCode: string,
  unmatchedCount: number | null,
): ReconciliationLaneStatus {
  switch (statusCode) {
    case "PENDING":
      return "Pending";
    case "IN_PROGRESS":
      return "In Progress";
    case "COMPLETED":
      return (unmatchedCount ?? 0) > 0 ? "Mismatches Found" : "Matched";
    case "FAILED":
      return "Mismatches Found";
    default:
      return "Pending";
  }
}

export async function getDashboardData(
  period: DashboardPeriod,
): Promise<DashboardData> {
  const { month, year } = period;

  const [invoices, fxRates, links, reports, reconciliations] =
    await Promise.all([
      prisma.invoice.findMany({
        where: { month, year },
        include: {
          items: { select: { lineTotal: true } },
          opco: { select: { id: true, name: true } },
          partner: { select: { id: true, name: true } },
          invoiceType: { select: { code: true } },
          paymentStatus: { select: { code: true } },
        },
      }),
      getMonthlyRatesForPeriod(month, year),
      prisma.opcoPartnerLink.findMany({
        where: ACTIVE_OPCO_PARTNER_LINK_FILTER,
        include: {
          opco: { select: { id: true, name: true } },
          partner: { select: { id: true, name: true } },
        },
      }),
      prisma.report.findMany({
        where: { month, year },
        orderBy: { createdAt: "desc" },
        include: {
          opco: { select: { id: true, name: true } },
          partner: { select: { id: true, name: true } },
          uploadedByUser: { select: { role: { select: { code: true } } } },
        },
      }),
      prisma.reconciliation.findMany({
        where: { month, year },
        orderBy: { runAt: "desc" },
        include: {
          opco: { select: { name: true } },
          partner: { select: { name: true } },
          status: { select: { code: true } },
        },
      }),
    ]);

  const fxByCurrency = new Map<string, number>();
  for (const rate of fxRates) {
    fxByCurrency.set(rate.currencyId, rate.rateToUsd);
  }

  const invoiceAmount = (items: { lineTotal: unknown }[]): number =>
    items.reduce((sum, item) => sum + toNumber(item.lineTotal), 0);

  let totalRevenuePaidUsd = 0;
  let pendingCollectionUsd = 0;
  let missingFxCount = 0;
  let invoicesPaid = 0;

  const revenueByOpco = new Map<string, DonutSegment>();
  const paymentStatusCounts = new Map<string, number>();

  const opcoInvoiced = new Set<string>();
  const opcoPaid = new Set<string>();
  const partnerInvoiced = new Set<string>();
  const partnerPaid = new Set<string>();

  for (const invoice of invoices) {
    const paymentCode = invoice.paymentStatus?.code ?? null;
    const isPaid = paymentCode === "PAID";
    const typeCode = invoice.invoiceType.code;
    const amount = invoiceAmount(invoice.items);
    const rate = fxByCurrency.get(invoice.currencyId.toString());
    const usd = rate !== undefined ? amount * rate : null;

    if (paymentCode) {
      pushSegment(paymentStatusCounts, paymentCode, 1);
    }
    if (isPaid) {
      invoicesPaid += 1;
    }

    if (typeCode === "CLIENT_TO_OPCO" && invoice.opcoId && invoice.opco) {
      const opcoKey = invoice.opcoId.toString();
      opcoInvoiced.add(opcoKey);
      if (isPaid) {
        opcoPaid.add(opcoKey);
        if (usd === null) {
          missingFxCount += 1;
        } else {
          totalRevenuePaidUsd += usd;
          pushNamedSegment(revenueByOpco, opcoKey, invoice.opco.name, usd);
        }
      } else if (usd !== null) {
        pendingCollectionUsd += usd;
      }
    } else if (typeCode === "PARTNER_TO_CLIENT" && invoice.partnerId) {
      const partnerKey = invoice.partnerId.toString();
      partnerInvoiced.add(partnerKey);
      if (isPaid) {
        partnerPaid.add(partnerKey);
      }
    }
  }

  const linkedOpcos = new Map<string, string>();
  const linkedPartners = new Map<string, string>();
  const linkKeys = new Set<string>();
  for (const link of links) {
    linkedOpcos.set(link.opco.id.toString(), link.opco.name);
    linkedPartners.set(link.partner.id.toString(), link.partner.name);
    linkKeys.add(`${link.opcoId.toString()}-${link.partnerId.toString()}`);
  }

  const sentToOpcos: DirectionPanel = {
    linked: linkedOpcos.size,
    invoiced: [...linkedOpcos.keys()].filter((id) => opcoInvoiced.has(id))
      .length,
    paid: [...linkedOpcos.keys()].filter((id) => opcoPaid.has(id)).length,
    missingNames: [...linkedOpcos.entries()]
      .filter(([id]) => !opcoInvoiced.has(id))
      .map(([, name]) => name),
  };

  const receivedFromPartners: DirectionPanel = {
    linked: linkedPartners.size,
    invoiced: [...linkedPartners.keys()].filter((id) =>
      partnerInvoiced.has(id),
    ).length,
    paid: [...linkedPartners.keys()].filter((id) => partnerPaid.has(id)).length,
    missingNames: [...linkedPartners.entries()]
      .filter(([id]) => !partnerInvoiced.has(id))
      .map(([, name]) => name),
  };

  const reportsByOpco = new Map<string, DonutSegment>();
  const reportsByPartner = new Map<string, DonutSegment>();
  const opcoReportLanes = new Set<string>();
  const partnerReportLanes = new Set<string>();

  for (const report of reports) {
    pushNamedSegment(
      reportsByOpco,
      report.opcoId.toString(),
      report.opco.name,
      1,
    );
    pushNamedSegment(
      reportsByPartner,
      report.partnerId.toString(),
      report.partner.name,
      1,
    );

    const laneKey = `${report.opcoId.toString()}-${report.partnerId.toString()}`;
    const uploaderRole = report.uploadedByUser?.role?.code;
    if (uploaderRole === "OPCO" && linkKeys.has(laneKey)) {
      opcoReportLanes.add(laneKey);
    } else if (uploaderRole === "PARTNER" && linkKeys.has(laneKey)) {
      partnerReportLanes.add(laneKey);
    }
  }

  const latestUpload = reports.length > 0 ? reports[0].createdAt.toISOString() : null;

  const reconciliation: ReconciliationLane[] = reconciliations.map((row) => {
    const matched = row.matchedCount ?? 0;
    const unmatched = row.unmatchedCount ?? 0;
    const total = matched + unmatched;
    const matchRate = total > 0 ? Math.round((matched / total) * 100) : 0;

    return {
      id: row.id,
      lane: `${row.opco.name} / ${row.partner.name}`,
      status: reconciliationLaneStatus(row.status.code, unmatched),
      matchRate,
    };
  });

  const recentUploads: RecentUpload[] = reports.slice(0, 8).map((report) => ({
    id: report.id.toString(),
    actorRole: report.uploadedByUser?.role?.code === "PARTNER" ? "Partner" : "OpCo",
    lane: `${report.opco.name} / ${report.partner.name}`,
    uploadedAt: report.createdAt.toISOString(),
  }));

  return {
    period,
    billing: {
      kpis: {
        invoices: invoices.length,
        totalRevenuePaidUsd,
        invoicesPaid,
        pendingCollectionUsd,
        missingFxCount,
      },
      revenueByOpco: namedMapToSegments(revenueByOpco),
      paymentStatus: mapToSegments(paymentStatusCounts),
      sentToOpcos,
      receivedFromPartners,
    },
    reportsRecon: {
      reportsSubmitted: reports.length,
      opcoReportsMissing: Math.max(0, linkKeys.size - opcoReportLanes.size),
      partnerReportsMissing: Math.max(0, linkKeys.size - partnerReportLanes.size),
      latestUpload,
      reportsByOpco: namedMapToSegments(reportsByOpco),
      reportsByPartner: namedMapToSegments(reportsByPartner),
      reconciliation,
    },
    recentUploads,
  };
}

import {
  currentPeriod,
  getDashboardData,
  type DashboardPeriod,
} from "@/lib/dizlee/dashboard";
import {
  getReportFilterOptions,
  type ReportFilterOptions,
} from "@/lib/dizlee/reports";
import { ACTIVE_OPCO_PARTNER_LINK_FILTER } from "@/lib/platform/opco-partner-links";
import { prisma } from "@/lib/prisma";

export type ReportingFilters = {
  month: number;
  year: number;
  opcoId?: string;
  partnerId?: string;
};

export type ReportingLaneStatus = "Complete" | "Missing" | "Partial";

export type ReportingLaneRow = {
  laneKey: string;
  opcoName: string;
  partnerName: string;
  opcoReport: boolean;
  partnerReport: boolean;
  opcoInvoice: boolean;
  partnerInvoice: boolean;
  reconciliationStatus: string | null;
  overallStatus: ReportingLaneStatus;
};

export type ReportingConsolidationRow = {
  opcoId: string;
  opcoName: string;
  generated: boolean;
  generatedAt: string | null;
  totalAmountUsd: number | null;
};

export type ReportingOverview = {
  period: DashboardPeriod;
  filters: ReportingFilters;
  summary: {
    linkedLanes: number;
    reportsComplete: number;
    invoicesComplete: number;
    reconciliationsRun: number;
    consolidationsGenerated: number;
    invoiceCount: number;
    invoicesPaid: number;
    totalRevenuePaidUsd: number;
  };
  lanes: ReportingLaneRow[];
  consolidations: ReportingConsolidationRow[];
};

function periodFromParts(month: number, year: number): DashboardPeriod {
  return {
    month,
    year,
    label: new Date(year, month - 1, 1).toLocaleString("en-US", {
      month: "long",
      year: "numeric",
    }),
  };
}

function laneOverallStatus(row: {
  opcoReport: boolean;
  partnerReport: boolean;
  opcoInvoice: boolean;
  partnerInvoice: boolean;
}): ReportingLaneStatus {
  const flags = [
    row.opcoReport,
    row.partnerReport,
    row.opcoInvoice,
    row.partnerInvoice,
  ];
  const complete = flags.filter(Boolean).length;
  if (complete === flags.length) {
    return "Complete";
  }
  if (complete === 0) {
    return "Missing";
  }
  return "Partial";
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
    opcoId: searchParams.get("opcoId") ?? undefined,
    partnerId: searchParams.get("partnerId") ?? undefined,
  };
}

export async function getReportingOverview(
  filters: ReportingFilters,
): Promise<ReportingOverview> {
  const period = periodFromParts(filters.month, filters.year);

  const linkWhere: {
    opcoId?: bigint;
    partnerId?: bigint;
  } = {};
  if (filters.opcoId) {
    linkWhere.opcoId = BigInt(filters.opcoId);
  }
  if (filters.partnerId) {
    linkWhere.partnerId = BigInt(filters.partnerId);
  }

  const reportWhere = {
    month: filters.month,
    year: filters.year,
    ...(filters.opcoId ? { opcoId: BigInt(filters.opcoId) } : {}),
    ...(filters.partnerId ? { partnerId: BigInt(filters.partnerId) } : {}),
  };

  const [
    links,
    reports,
    invoices,
    reconciliations,
    consolidations,
    dashboard,
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
      where: reportWhere,
      include: {
        uploadedByUser: { select: { role: { select: { code: true } } } },
      },
    }),
    prisma.invoice.findMany({
      where: reportWhere,
      include: { invoiceType: { select: { code: true } } },
    }),
    prisma.reconciliation.findMany({
      where: reportWhere,
      include: { status: { select: { code: true } } },
    }),
    prisma.consolidation.findMany({
      where: {
        month: filters.month,
        year: filters.year,
        isDeleted: false,
        ...(filters.opcoId ? { opcoId: BigInt(filters.opcoId) } : {}),
      },
      include: {
        opco: { select: { id: true, name: true } },
      },
    }),
    getDashboardData(period),
  ]);

  const opcoReports = new Set<string>();
  const partnerReports = new Set<string>();
  for (const report of reports) {
    const laneKey = `${report.opcoId.toString()}-${report.partnerId.toString()}`;
    const role = report.uploadedByUser?.role?.code;
    if (role === "OPCO") {
      opcoReports.add(laneKey);
    } else if (role === "PARTNER") {
      partnerReports.add(laneKey);
    }
  }

  const opcoInvoices = new Set<string>();
  const partnerInvoices = new Set<string>();
  for (const invoice of invoices) {
    if (!invoice.partnerId) {
      continue;
    }
    const laneKey = `${invoice.opcoId.toString()}-${invoice.partnerId.toString()}`;
    if (invoice.invoiceType.code === "CLIENT_TO_OPCO") {
      opcoInvoices.add(laneKey);
    } else if (invoice.invoiceType.code === "PARTNER_TO_CLIENT") {
      partnerInvoices.add(laneKey);
    }
  }

  const reconciliationByLane = new Map(
    reconciliations.map((row) => [
      `${row.opcoId.toString()}-${row.partnerId.toString()}`,
      row.status.code.replaceAll("_", " "),
    ]),
  );

  const lanes: ReportingLaneRow[] = links.map((link) => {
    const laneKey = `${link.opcoId.toString()}-${link.partnerId.toString()}`;
    const row = {
      opcoReport: opcoReports.has(laneKey),
      partnerReport: partnerReports.has(laneKey),
      opcoInvoice: opcoInvoices.has(laneKey),
      partnerInvoice: partnerInvoices.has(laneKey),
    };

    return {
      laneKey,
      opcoName: link.opco.name,
      partnerName: link.partner.name,
      ...row,
      reconciliationStatus: reconciliationByLane.get(laneKey) ?? null,
      overallStatus: laneOverallStatus(row),
    };
  });

  const opcoIdsInScope = new Map<string, string>();
  for (const link of links) {
    opcoIdsInScope.set(link.opco.id.toString(), link.opco.name);
  }
  if (filters.opcoId && opcoIdsInScope.size === 0) {
    const opco = await prisma.opco.findUnique({
      where: { id: BigInt(filters.opcoId) },
      select: { id: true, name: true },
    });
    if (opco) {
      opcoIdsInScope.set(opco.id.toString(), opco.name);
    }
  }

  const consolidationByOpco = new Map(
    consolidations.map((row) => [row.opcoId.toString(), row]),
  );

  const consolidationRows: ReportingConsolidationRow[] = [...opcoIdsInScope.entries()]
    .map(([opcoId, opcoName]) => {
      const row = consolidationByOpco.get(opcoId);
      return {
        opcoId,
        opcoName,
        generated: Boolean(row),
        generatedAt: row?.generatedAt.toISOString() ?? null,
        totalAmountUsd:
          row?.totalAmountUsd !== null && row?.totalAmountUsd !== undefined
            ? Number(row.totalAmountUsd)
            : null,
      };
    })
    .sort((a, b) => a.opcoName.localeCompare(b.opcoName));

  const reportsComplete = lanes.filter(
    (lane) => lane.opcoReport && lane.partnerReport,
  ).length;
  const invoicesComplete = lanes.filter(
    (lane) => lane.opcoInvoice && lane.partnerInvoice,
  ).length;

  return {
    period,
    filters,
    summary: {
      linkedLanes: lanes.length,
      reportsComplete,
      invoicesComplete,
      reconciliationsRun: reconciliations.length,
      consolidationsGenerated: consolidations.length,
      invoiceCount: dashboard.billing.kpis.invoices,
      invoicesPaid: dashboard.billing.kpis.invoicesPaid,
      totalRevenuePaidUsd: dashboard.billing.kpis.totalRevenuePaidUsd,
    },
    lanes,
    consolidations: consolidationRows,
  };
}

export { getReportFilterOptions, type ReportFilterOptions };

import { currentPeriod, type DashboardPeriod } from "@/lib/dizlee/dashboard";
import {
  aggregatePartnerLines,
  type ConsolidationLineInput,
} from "@/lib/dizlee/consolidation/aggregate";
import { getLookupId } from "@/lib/dizlee/lookups";
import { ACTIVE_OPCO_PARTNER_LINK_FILTER } from "@/lib/platform/opco-partner-links";
import { prisma } from "@/lib/prisma";

export type ConsolidationReadinessPartner = {
  partnerId: string;
  partnerName: string;
  hasReport: boolean;
  lineItemCount: number;
  reportId: string | null;
};

export type ConsolidationReadiness = {
  opcoId: string;
  opcoName: string;
  period: DashboardPeriod;
  linkedCount: number;
  ready: boolean;
  missingPartners: string[];
  partners: ConsolidationReadinessPartner[];
  existingConsolidationId: number | null;
};

export type ConsolidationHistoryItem = {
  id: number;
  period: DashboardPeriod;
  opcoName: string;
  status: string;
  totalAmountUsd: number | null;
  itemCount: number;
  generatedAt: string;
  runBy: string;
};

export type ConsolidationHistoryResult = {
  items: ConsolidationHistoryItem[];
  page: number;
  pageSize: number;
  totalPages: number;
  totalCount: number;
};

export type ConsolidationItemView = {
  partnerId: string | null;
  partnerName: string;
  serviceCode: string | null;
  description: string;
  usageAmount: number;
  usageUsd: number | null;
  exchangeRate: number | null;
  usageUnit: string | null;
  revenueBasis: string | null;
};

export type ConsolidationDetail = {
  id: number;
  opcoId: string;
  opcoName: string;
  period: DashboardPeriod;
  status: string;
  statusCode: string;
  totalAmountUsd: number | null;
  generatedAt: string;
  runBy: string;
  items: ConsolidationItemView[];
};

const HISTORY_PAGE_SIZE = 10;

export class ConsolidationError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
  ) {
    super(message);
    this.name = "ConsolidationError";
  }
}

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

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  return Number(value as never);
}

export function parseGenerateFilters(searchParams: URLSearchParams): {
  month: number;
  year: number;
  opcoId?: string;
} {
  const fallback = currentPeriod();
  const month = Number(searchParams.get("month"));
  const year = Number(searchParams.get("year"));

  return {
    month:
      Number.isInteger(month) && month >= 1 && month <= 12 ? month : fallback.month,
    year:
      Number.isInteger(year) && year >= 2000 && year <= 2100 ? year : fallback.year,
    opcoId: searchParams.get("opcoId") ?? undefined,
  };
}

export function parseHistoryFilters(searchParams: URLSearchParams): {
  month?: number;
  year?: number;
  opcoId?: string;
  search?: string;
  page: number;
} {
  const month = Number(searchParams.get("month"));
  const year = Number(searchParams.get("year"));
  const page = Number(searchParams.get("page"));

  return {
    month:
      Number.isInteger(month) && month >= 1 && month <= 12 ? month : undefined,
    year:
      Number.isInteger(year) && year >= 2000 && year <= 2100 ? year : undefined,
    opcoId: searchParams.get("opcoId") ?? undefined,
    search: searchParams.get("search")?.trim() || undefined,
    page: Number.isInteger(page) && page >= 1 ? page : 1,
  };
}

async function writeAuditLog(params: {
  actorUserId: bigint;
  consolidationId: number;
  message: string;
  regenerated: boolean;
}): Promise<void> {
  const [actionId, entityTypeId] = await Promise.all([
    getLookupId("AUDIT_ACTION", "CONSOLIDATION_GENERATED"),
    getLookupId("AUDIT_ENTITY_TYPE", "CONSOLIDATION"),
  ]);

  await prisma.auditLog.create({
    data: {
      actorUserId: params.actorUserId,
      actionId,
      entityTypeId,
      entityId: BigInt(params.consolidationId),
      message: params.message,
      metadata: { regenerated: params.regenerated },
    },
  });
}

function toConsolidationLine(line: {
  lineNumber: number;
  description: string | null;
  usageAmount: unknown;
  usageUsd: unknown;
  amount: unknown;
  exchangeRate: unknown;
  usageUnit: string | null;
  reconciliationBasis: string | null;
  sourceColumns: unknown;
}): ConsolidationLineInput {
  return {
    lineNumber: line.lineNumber,
    description: line.description,
    usageAmount: toNumber(line.usageAmount),
    usageUsd: toNumber(line.usageUsd),
    amount: toNumber(line.amount),
    exchangeRate: toNumber(line.exchangeRate),
    usageUnit: line.usageUnit,
    reconciliationBasis: line.reconciliationBasis,
    sourceColumns:
      line.sourceColumns && typeof line.sourceColumns === "object"
        ? (line.sourceColumns as Record<string, unknown>)
        : null,
  };
}

export async function getConsolidationReadiness(params: {
  month: number;
  year: number;
  opcoId: string;
}): Promise<ConsolidationReadiness> {
  const opco = await prisma.opco.findUnique({
    where: { id: BigInt(params.opcoId) },
    select: { id: true, name: true },
  });

  if (!opco) {
    throw new ConsolidationError("OpCo not found.", 404);
  }

  const [links, reports, existing] = await Promise.all([
    prisma.opcoPartnerLink.findMany({
      where: {
        opcoId: BigInt(params.opcoId),
        ...ACTIVE_OPCO_PARTNER_LINK_FILTER,
      },
      orderBy: { partner: { name: "asc" } },
      include: { partner: { select: { id: true, name: true } } },
    }),
    prisma.report.findMany({
      where: {
        opcoId: BigInt(params.opcoId),
        month: params.month,
        year: params.year,
        uploadedByUser: { role: { code: "OPCO" } },
        isDeleted: false,
      },
      include: {
        lineItems: {
          where: { isDeleted: false },
          select: { id: true },
        },
      },
    }),
    prisma.consolidation.findFirst({
      where: {
        opcoId: BigInt(params.opcoId),
        month: params.month,
        year: params.year,
        isDeleted: false,
      },
      select: { id: true },
    }),
  ]);

  const reportsByPartner = new Map(
    reports.map((report) => [report.partnerId.toString(), report]),
  );

  const partners: ConsolidationReadinessPartner[] = links.map((link) => {
    const report = reportsByPartner.get(link.partnerId.toString());
    return {
      partnerId: link.partner.id.toString(),
      partnerName: link.partner.name,
      hasReport: Boolean(report),
      lineItemCount: report?.lineItems.length ?? 0,
      reportId: report?.id.toString() ?? null,
    };
  });

  const missingPartners = partners
    .filter((partner) => !partner.hasReport || partner.lineItemCount === 0)
    .map((partner) => partner.partnerName);

  return {
    opcoId: opco.id.toString(),
    opcoName: opco.name,
    period: periodFromParts(params.month, params.year),
    linkedCount: links.length,
    ready: links.length > 0 && missingPartners.length === 0,
    missingPartners,
    partners,
    existingConsolidationId: existing?.id ?? null,
  };
}

export async function generateConsolidation(params: {
  month: number;
  year: number;
  opcoId: string;
  runByUserId: string;
}): Promise<{ id: number; message: string; regenerated: boolean }> {
  const readiness = await getConsolidationReadiness({
    month: params.month,
    year: params.year,
    opcoId: params.opcoId,
  });

  if (readiness.linkedCount === 0) {
    throw new ConsolidationError(
      "This OpCo has no linked partners to consolidate.",
      400,
    );
  }

  if (!readiness.ready) {
    throw new ConsolidationError(
      `Missing OpCo reports for: ${readiness.missingPartners.join(", ")}`,
      400,
    );
  }

  const reports = await prisma.report.findMany({
    where: {
      opcoId: BigInt(params.opcoId),
      month: params.month,
      year: params.year,
      uploadedByUser: { role: { code: "OPCO" } },
      isDeleted: false,
    },
    include: {
      partner: { select: { id: true, name: true } },
      lineItems: {
        where: { isDeleted: false },
        orderBy: { lineNumber: "asc" },
      },
    },
  });

  const itemRows: Array<{
    partnerId: bigint;
    partnerName: string;
    serviceCode: string;
    description: string;
    usageAmount: number;
    usageUsd: number;
    exchangeRate: number | null;
    usageUnit: string | null;
    revenueBasis: string | null;
  }> = [];

  for (const report of reports) {
    const aggregated = aggregatePartnerLines(
      report.lineItems.map(toConsolidationLine),
    );

    for (const item of aggregated) {
      itemRows.push({
        partnerId: report.partner.id,
        partnerName: report.partner.name,
        serviceCode: item.serviceCode,
        description: item.description,
        usageAmount: item.usageAmount,
        usageUsd: item.usageUsd,
        exchangeRate: item.exchangeRate,
        usageUnit: item.usageUnit,
        revenueBasis: item.revenueBasis,
      });
    }
  }

  if (itemRows.length === 0) {
    throw new ConsolidationError(
      "No line items found in OpCo reports for this period.",
      400,
    );
  }

  const totalAmountUsd = itemRows.reduce((sum, row) => sum + row.usageUsd, 0);
  const completedStatusId = await getLookupId("CONSOLIDATION_STATUS", "COMPLETED");
  const runByUserId = BigInt(params.runByUserId);
  const generatedAt = new Date();
  const regenerated = Boolean(readiness.existingConsolidationId);

  let consolidationId: number;

  if (readiness.existingConsolidationId) {
    consolidationId = readiness.existingConsolidationId;

    await prisma.$transaction([
      prisma.consolidationItem.deleteMany({
        where: { consolidationId },
      }),
      prisma.consolidation.update({
        where: { id: consolidationId },
        data: {
          statusId: completedStatusId,
          totalAmountUsd,
          generatedAt,
          runByUserId,
          updatedByUserId: runByUserId,
        },
      }),
    ]);
  } else {
    const created = await prisma.consolidation.create({
      data: {
        opcoId: BigInt(params.opcoId),
        month: params.month,
        year: params.year,
        statusId: completedStatusId,
        totalAmountUsd,
        generatedAt,
        runByUserId,
        createdByUserId: runByUserId,
        updatedByUserId: runByUserId,
      },
    });
    consolidationId = created.id;
  }

  await prisma.consolidationItem.createMany({
    data: itemRows.map((row) => ({
      consolidationId,
      partnerId: row.partnerId,
      partnerName: row.partnerName,
      serviceCode: row.serviceCode,
      description: row.description,
      usageAmount: row.usageAmount,
      usageUsd: row.usageUsd,
      exchangeRate: row.exchangeRate,
      usageUnit: row.usageUnit,
      revenueBasis: row.revenueBasis,
      createdByUserId: runByUserId,
      updatedByUserId: runByUserId,
    })),
  });

  const message = regenerated
    ? "Consolidation regenerated successfully."
    : "Consolidation generated successfully.";

  await writeAuditLog({
    actorUserId: runByUserId,
    consolidationId,
    message,
    regenerated,
  });

  return { id: consolidationId, message, regenerated };
}

export async function listConsolidationHistory(filters: {
  month?: number;
  year?: number;
  opcoId?: string;
  search?: string;
  page: number;
}): Promise<ConsolidationHistoryResult> {
  const where = {
    isDeleted: false,
    ...(filters.month ? { month: filters.month } : {}),
    ...(filters.year ? { year: filters.year } : {}),
    ...(filters.opcoId ? { opcoId: BigInt(filters.opcoId) } : {}),
    ...(filters.search
      ? {
          OR: [
            { opco: { name: { contains: filters.search } } },
            { runBy: { name: { contains: filters.search } } },
            { status: { code: { contains: filters.search } } },
          ],
        }
      : {}),
  };

  const [totalCount, rows] = await Promise.all([
    prisma.consolidation.count({ where }),
    prisma.consolidation.findMany({
      where,
      orderBy: { generatedAt: "desc" },
      skip: (filters.page - 1) * HISTORY_PAGE_SIZE,
      take: HISTORY_PAGE_SIZE,
      include: {
        opco: { select: { name: true } },
        status: { select: { code: true } },
        runBy: { select: { name: true } },
        _count: { select: { items: true } },
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / HISTORY_PAGE_SIZE));
  const page = Math.min(filters.page, totalPages);

  return {
    items: rows.map((row) => ({
      id: row.id,
      period: periodFromParts(row.month, row.year),
      opcoName: row.opco.name,
      status: row.status.code.replaceAll("_", " "),
      totalAmountUsd: toNumber(row.totalAmountUsd),
      itemCount: row._count.items,
      generatedAt: row.generatedAt.toISOString(),
      runBy: row.runBy.name ?? "Unknown",
    })),
    page,
    pageSize: HISTORY_PAGE_SIZE,
    totalPages,
    totalCount,
  };
}

export async function getConsolidationDetail(
  id: number,
): Promise<ConsolidationDetail | null> {
  const row = await prisma.consolidation.findFirst({
    where: { id, isDeleted: false },
    include: {
      opco: { select: { id: true, name: true } },
      status: { select: { code: true } },
      runBy: { select: { name: true } },
      items: {
        where: { isDeleted: false },
        orderBy: [{ partnerName: "asc" }, { serviceCode: "asc" }],
      },
    },
  });

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    opcoId: row.opco.id.toString(),
    opcoName: row.opco.name,
    period: periodFromParts(row.month, row.year),
    status: row.status.code.replaceAll("_", " "),
    statusCode: row.status.code,
    totalAmountUsd: toNumber(row.totalAmountUsd),
    generatedAt: row.generatedAt.toISOString(),
    runBy: row.runBy.name ?? "Unknown",
    items: row.items.map((item) => ({
      partnerId: item.partnerId?.toString() ?? null,
      partnerName: item.partnerName,
      serviceCode: item.serviceCode,
      description: item.description,
      usageAmount: toNumber(item.usageAmount) ?? 0,
      usageUsd: toNumber(item.usageUsd),
      exchangeRate: toNumber(item.exchangeRate),
      usageUnit: item.usageUnit,
      revenueBasis: item.revenueBasis,
    })),
  };
}

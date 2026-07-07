import type { Prisma } from "@prisma/client";

import { formatPeriodLabel } from "@/lib/partner/period";
import { getLinkedOpcosForPartner } from "@/lib/partner/queries/opcos";
import { mapReuploadEligibility } from "@/lib/partner/reupload/eligibility";
import prisma from "@/lib/prisma";

export type PartnerReportSortField = "uploaded" | "period" | "opco";
export type PartnerSortDirection = "asc" | "desc";

export type PartnerReportListFilters = {
  year?: number;
  month?: number;
  opcoId?: string;
  statusCode?: string;
  sortBy: PartnerReportSortField;
  sortDir: PartnerSortDirection;
  page: number;
};

export type PartnerReportListItem = {
  id: string;
  opcoId: string;
  opcoName: string;
  year: number;
  month: number;
  statusLabel: string;
  statusCode: string;
  filename: string | null;
  lineItemCount: number;
  uploadedAt: string;
  hasPendingChangeRequest: boolean;
  canReupload: boolean;
};

export type PartnerReportListResult = {
  items: PartnerReportListItem[];
  page: number;
  pageSize: number;
  totalPages: number;
  totalCount: number;
  filters: PartnerReportListFilters;
};

export type PartnerReportLineItem = {
  lineNumber: number;
  description: string | null;
  usageAmount: string | null;
  usageUsd: string | null;
  amount: string | null;
  exchangeRate: string | null;
  usageUnit: string | null;
  reconciliationBasis: string | null;
};

export type PartnerReportDetail = {
  id: string;
  opcoName: string;
  year: number;
  month: number;
  periodLabel: string;
  statusLabel: string;
  statusCode: string;
  filename: string | null;
  fileSizeBytes: number | null;
  uploadedAt: string;
  lineItemCount: number;
  lineItems: PartnerReportLineItem[];
  hasPendingChangeRequest: boolean;
  canReupload: boolean;
};

export type PartnerReportFilterOptions = {
  opcos: Array<{ id: string; name: string }>;
  statuses: Array<{ code: string; label: string }>;
};

export const PARTNER_REPORTS_PAGE_SIZE = 25;

function buildOrderBy(
  sortBy: PartnerReportSortField,
  sortDir: PartnerSortDirection,
): Prisma.ReportOrderByWithRelationInput | Prisma.ReportOrderByWithRelationInput[] {
  switch (sortBy) {
    case "period":
      return [{ year: sortDir }, { month: sortDir }, { createdAt: "desc" }];
    case "opco":
      return { opco: { name: sortDir } };
    case "uploaded":
    default:
      return { createdAt: sortDir };
  }
}

function buildWhere(
  partnerId: bigint,
  filters: PartnerReportListFilters,
): Prisma.ReportWhereInput {
  const where: Prisma.ReportWhereInput = { partnerId };

  if (filters.year !== undefined) {
    where.year = filters.year;
  }
  if (filters.month !== undefined) {
    where.month = filters.month;
  }
  if (filters.opcoId) {
    where.opcoId = BigInt(filters.opcoId);
  }
  if (filters.statusCode) {
    where.status = { code: filters.statusCode };
  }

  return where;
}

function decimalToString(value: Prisma.Decimal | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  return value.toString();
}

function mapLineItem(
  item: {
    lineNumber: number;
    description: string | null;
    usageAmount: Prisma.Decimal | null;
    usageUsd: Prisma.Decimal | null;
    amount: Prisma.Decimal | null;
    exchangeRate: Prisma.Decimal | null;
    usageUnit: string | null;
    reconciliationBasis: string | null;
  },
): PartnerReportLineItem {
  return {
    lineNumber: item.lineNumber,
    description: item.description,
    usageAmount: decimalToString(item.usageAmount),
    usageUsd: decimalToString(item.usageUsd),
    amount: decimalToString(item.amount),
    exchangeRate: decimalToString(item.exchangeRate),
    usageUnit: item.usageUnit,
    reconciliationBasis: item.reconciliationBasis,
  };
}

export function parsePartnerReportListFilters(
  searchParams: URLSearchParams,
): PartnerReportListFilters {
  const yearParam = searchParams.get("year");
  const monthParam = searchParams.get("month");
  const page = Number(searchParams.get("page"));
  const sortBy = searchParams.get("sortBy");
  const sortDir = searchParams.get("sortDir");

  let year: number | undefined;
  let month: number | undefined;

  if (yearParam) {
    const parsedYear = Number(yearParam);
    if (Number.isInteger(parsedYear) && parsedYear >= 2000 && parsedYear <= 2100) {
      year = parsedYear;
    }
  }

  if (monthParam) {
    const parsedMonth = Number(monthParam);
    if (Number.isInteger(parsedMonth) && parsedMonth >= 1 && parsedMonth <= 12) {
      month = parsedMonth;
    }
  }

  const opcoId = searchParams.get("opcoId")?.trim();
  const statusCode = searchParams.get("status")?.trim();

  return {
    year,
    month,
    opcoId: opcoId || undefined,
    statusCode: statusCode || undefined,
    sortBy:
      sortBy === "period" || sortBy === "opco" || sortBy === "uploaded"
        ? sortBy
        : "uploaded",
    sortDir: sortDir === "asc" ? "asc" : "desc",
    page: Number.isInteger(page) && page >= 1 ? page : 1,
  };
}

export async function getPartnerReportFilterOptions(
  partnerId: bigint,
): Promise<PartnerReportFilterOptions> {
  const [opcos, statuses] = await Promise.all([
    getLinkedOpcosForPartner(partnerId),
    prisma.lookup.findMany({
      where: { lookupType: { code: "REPORT_STATUS" } },
      orderBy: { label: "asc" },
      select: { code: true, label: true },
    }),
  ]);

  return { opcos, statuses };
}

export async function searchReportsForPartner(
  partnerId: bigint,
  filters: PartnerReportListFilters,
): Promise<PartnerReportListResult> {
  const where = buildWhere(partnerId, filters);

  const [totalCount, rows] = await Promise.all([
    prisma.report.count({ where }),
    prisma.report.findMany({
      where,
      orderBy: buildOrderBy(filters.sortBy, filters.sortDir),
      skip: (filters.page - 1) * PARTNER_REPORTS_PAGE_SIZE,
      take: PARTNER_REPORTS_PAGE_SIZE,
      include: {
        opco: { select: { id: true, name: true } },
        status: { select: { code: true, label: true } },
        file: { select: { filename: true } },
        changeRequests: {
          select: {
            id: true,
            decidedAt: true,
            completedAt: true,
            status: { select: { code: true } },
          },
        },
        _count: { select: { lineItems: true } },
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PARTNER_REPORTS_PAGE_SIZE));

  return {
    items: rows.map((report) => ({
      id: report.id.toString(),
      opcoId: report.opco.id.toString(),
      opcoName: report.opco.name,
      year: report.year,
      month: report.month,
      statusLabel: report.status.label,
      statusCode: report.status.code,
      filename: report.file?.filename ?? null,
      lineItemCount: report._count.lineItems,
      uploadedAt: report.createdAt.toISOString(),
      hasPendingChangeRequest: report.changeRequests.some(
        (request) => request.decidedAt === null,
      ),
      canReupload: mapReuploadEligibility(report.status.code, report.changeRequests),
    })),
    page: filters.page,
    pageSize: PARTNER_REPORTS_PAGE_SIZE,
    totalPages,
    totalCount,
    filters,
  };
}

export async function getReportDetailForPartner(
  partnerId: bigint,
  reportId: bigint,
): Promise<PartnerReportDetail | null> {
  const report = await prisma.report.findFirst({
    where: {
      id: reportId,
      partnerId,
    },
    include: {
      opco: { select: { name: true } },
      status: { select: { code: true, label: true } },
      file: { select: { filename: true, sizeBytes: true } },
      lineItems: {
        orderBy: { lineNumber: "asc" },
      },
      changeRequests: {
        select: {
          id: true,
          decidedAt: true,
          completedAt: true,
          status: { select: { code: true } },
        },
      },
    },
  });

  if (!report) {
    return null;
  }

  return {
    id: report.id.toString(),
    opcoName: report.opco.name,
    year: report.year,
    month: report.month,
    periodLabel: formatPeriodLabel(report.year, report.month),
    statusLabel: report.status.label,
    statusCode: report.status.code,
    filename: report.file?.filename ?? null,
    fileSizeBytes: report.file?.sizeBytes ? Number(report.file.sizeBytes) : null,
    uploadedAt: report.createdAt.toISOString(),
    lineItemCount: report.lineItems.length,
    lineItems: report.lineItems.map(mapLineItem),
    hasPendingChangeRequest: report.changeRequests.some(
      (request) => request.decidedAt === null,
    ),
    canReupload: mapReuploadEligibility(report.status.code, report.changeRequests),
  };
}

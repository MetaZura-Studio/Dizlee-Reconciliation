/**
 * OpCo report list, detail, and URL filter parsing.
 *
 * Portal: OpCo. All queries filter `version: OPCO_REPORT_VERSION` and `opcoId`.
 * Reupload eligibility is derived from change-request workflow, not status alone.
 */

import type { Prisma } from "@prisma/client";

import { formatPeriodLabel } from "@/lib/opco/period";
import { getLinkedPartnersForOpco } from "@/lib/opco/queries/partners";
import { mapReuploadEligibility } from "@/lib/opco/reupload/eligibility";
import { OPCO_REPORT_VERSION } from "@/lib/platform/reports/sides";
import { applyReportFxToAmount, getReportFx } from "@/lib/platform/report-fx";
import prisma from "@/lib/prisma";

export type OpcoReportSortField = "uploaded" | "period" | "partner";
export type OpcoSortDirection = "asc" | "desc";

export type OpcoReportListFilters = {
  year?: number;
  month?: number;
  partnerId?: string;
  statusCode?: string;
  search?: string;
  sortBy: OpcoReportSortField;
  sortDir: OpcoSortDirection;
  page: number;
};

export type OpcoReportListItem = {
  id: string;
  partnerId: string;
  partnerName: string;
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

export type OpcoReportListResult = {
  items: OpcoReportListItem[];
  page: number;
  pageSize: number;
  totalPages: number;
  totalCount: number;
  filters: OpcoReportListFilters;
};

export type OpcoReportLineItem = {
  lineNumber: number;
  description: string | null;
  amount: string | null;
  amountUsd: string | null;
  exchangeRate: string | null;
  usageAmount: string | null;
  usageUsd: string | null;
  usageUnit: string | null;
  reconciliationBasis: string | null;
};

export type OpcoReportDetail = {
  id: string;
  partnerName: string;
  year: number;
  month: number;
  periodLabel: string;
  statusLabel: string;
  statusCode: string;
  filename: string | null;
  fileSizeBytes: number | null;
  uploadedAt: string;
  lineItemCount: number;
  currencyCode: string;
  lineItems: OpcoReportLineItem[];
  hasPendingChangeRequest: boolean;
  canReupload: boolean;
};

export type OpcoReportFilterOptions = {
  partners: Array<{ id: string; name: string }>;
  statuses: Array<{ code: string; label: string }>;
};

export const OPCO_REPORTS_PAGE_SIZE = 10;

function buildOrderBy(
  sortBy: OpcoReportSortField,
  sortDir: OpcoSortDirection,
): Prisma.ReportOrderByWithRelationInput | Prisma.ReportOrderByWithRelationInput[] {
  switch (sortBy) {
    case "period":
      return [{ year: sortDir }, { month: sortDir }, { createdAt: "desc" }];
    case "partner":
      return { partner: { name: sortDir } };
    case "uploaded":
    default:
      return { createdAt: sortDir };
  }
}

function buildWhere(
  opcoId: bigint,
  filters: OpcoReportListFilters,
): Prisma.ReportWhereInput {
  const where: Prisma.ReportWhereInput = {
    opcoId,
    version: OPCO_REPORT_VERSION,
    isDeleted: false,
  };

  if (filters.year !== undefined) {
    where.year = filters.year;
  }
  if (filters.month !== undefined) {
    where.month = filters.month;
  }
  if (filters.partnerId) {
    where.partnerId = BigInt(filters.partnerId);
  }
  if (filters.statusCode) {
    where.status = { code: filters.statusCode };
  }
  if (filters.search) {
    where.OR = [
      { file: { filename: { contains: filters.search } } },
      { partner: { name: { contains: filters.search } } },
    ];
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
    rateToUsd: number | null;
  },
): OpcoReportLineItem {
  const converted = applyReportFxToAmount(
    decimalToString(item.amount),
    item.rateToUsd,
  );
  return {
    lineNumber: item.lineNumber,
    description: item.description,
    usageAmount: decimalToString(item.usageAmount),
    usageUsd: decimalToString(item.usageUsd),
    amount: decimalToString(item.amount),
    amountUsd: converted.amountUsd,
    exchangeRate: converted.exchangeRate,
    usageUnit: item.usageUnit,
    reconciliationBasis: item.reconciliationBasis,
  };
}

export function parseOpcoReportListFilters(
  searchParams: URLSearchParams,
): OpcoReportListFilters {
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

  const partnerId = searchParams.get("partnerId")?.trim();
  const statusCode = searchParams.get("status")?.trim();
  const search = searchParams.get("search")?.trim();

  return {
    year,
    month,
    partnerId: partnerId || undefined,
    statusCode: statusCode || undefined,
    search: search || undefined,
    sortBy:
      sortBy === "period" || sortBy === "partner" || sortBy === "uploaded"
        ? sortBy
        : "uploaded",
    sortDir: sortDir === "asc" ? "asc" : "desc",
    page: Number.isInteger(page) && page >= 1 ? page : 1,
  };
}

export async function getOpcoReportFilterOptions(
  opcoId: bigint,
): Promise<OpcoReportFilterOptions> {
  const [partners, statuses] = await Promise.all([
    getLinkedPartnersForOpco(opcoId),
    prisma.lookup.findMany({
      where: { lookupType: { code: "REPORT_STATUS" } },
      orderBy: { label: "asc" },
      select: { code: true, label: true },
    }),
  ]);

  return { partners, statuses };
}

export async function searchReportsForOpco(
  opcoId: bigint,
  filters: OpcoReportListFilters,
): Promise<OpcoReportListResult> {
  const where = buildWhere(opcoId, filters);

  const [totalCount, rows] = await Promise.all([
    prisma.report.count({ where }),
    prisma.report.findMany({
      where,
      orderBy: buildOrderBy(filters.sortBy, filters.sortDir),
      skip: (filters.page - 1) * OPCO_REPORTS_PAGE_SIZE,
      take: OPCO_REPORTS_PAGE_SIZE,
      include: {
        partner: { select: { id: true, name: true } },
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

  const totalPages = Math.max(1, Math.ceil(totalCount / OPCO_REPORTS_PAGE_SIZE));

  return {
    items: rows.map((report) => ({
      id: report.id.toString(),
      partnerId: report.partner.id.toString(),
      partnerName: report.partner.name,
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
    pageSize: OPCO_REPORTS_PAGE_SIZE,
    totalPages,
    totalCount,
    filters,
  };
}

export async function getReportDetailForOpco(
  opcoId: bigint,
  reportId: bigint,
): Promise<OpcoReportDetail | null> {
  const report = await prisma.report.findFirst({
    where: {
      id: reportId,
      opcoId,
      version: OPCO_REPORT_VERSION,
      isDeleted: false,
    },
    include: {
      partner: { select: { name: true } },
      status: { select: { code: true, label: true } },
      currency: { select: { id: true } },
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

  const fx = await getReportFx({
    currencyId: report.currency.id,
    month: report.month,
    year: report.year,
  });

  return {
    id: report.id.toString(),
    partnerName: report.partner.name,
    year: report.year,
    month: report.month,
    periodLabel: formatPeriodLabel(report.year, report.month),
    statusLabel: report.status.label,
    statusCode: report.status.code,
    filename: report.file?.filename ?? null,
    fileSizeBytes: report.file?.sizeBytes ? Number(report.file.sizeBytes) : null,
    uploadedAt: report.createdAt.toISOString(),
    lineItemCount: report.lineItems.length,
    currencyCode: fx.currencyCode,
    lineItems: report.lineItems.map((item) =>
      mapLineItem({ ...item, rateToUsd: fx.rateToUsd }),
    ),
    hasPendingChangeRequest: report.changeRequests.some(
      (request) => request.decidedAt === null,
    ),
    canReupload: mapReuploadEligibility(report.status.code, report.changeRequests),
  };
}

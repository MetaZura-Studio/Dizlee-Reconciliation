/**
 * Dizlee reports history: paginated listing, sorting, and filter option loaders.
 * Consumed by reports UI, reupload requests, reporting, and report monitoring flows.
 */

import type { Prisma } from "@prisma/client";

import { currentPeriod, type DashboardPeriod } from "@/lib/dizlee/dashboard";
import { applyReportFxToAmount, getReportFx } from "@/lib/platform/report-fx";
import {
  PARTNER_REPORT_VERSION,
  type ReportUploaderSide,
} from "@/lib/platform/reports/sides";
import { prisma } from "@/lib/prisma";

export type ReportSortField = "uploaded" | "period" | "opco" | "partner";
export type SortDirection = "asc" | "desc";

export type ReportListFilters = {
  month: number;
  year: number;
  opcoId?: string;
  partnerId?: string;
  search?: string;
  sortBy: ReportSortField;
  sortDir: SortDirection;
  page: number;
};

export type ReportListItem = {
  id: string;
  period: DashboardPeriod;
  opcoName: string;
  partnerName: string;
  filename: string | null;
  uploadedAt: string;
  status: string;
  uploadedBy: string;
};

export type ReportListResult = {
  items: ReportListItem[];
  page: number;
  pageSize: number;
  totalPages: number;
  totalCount: number;
  filters: ReportListFilters;
};

export type ReportLineItem = {
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

export type ReportDetail = {
  id: string;
  period: DashboardPeriod;
  lane: string;
  opcoName: string;
  partnerName: string;
  uploadedBy: string;
  uploadedAt: string;
  status: string;
  filename: string | null;
  fileSizeBytes: number | null;
  previewUrl: string | null;
  lineItemCount: number;
  currencyCode: string;
  side: ReportUploaderSide;
  lineItems: ReportLineItem[];
};

export type ReportFilterOptions = {
  opcos: Array<{ id: string; name: string }>;
  partners: Array<{ id: string; name: string }>;
};

const PAGE_SIZE = 10;

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

function uploadedByLabel(roleCode: string | undefined): string {
  switch (roleCode) {
    case "OPCO":
      return "OpCo";
    case "PARTNER":
      return "Partner";
    case "CLIENT":
      return "Dizlee";
    case "ADMIN":
      return "Admin";
    default:
      return "Unknown";
  }
}

function buildOrderBy(
  sortBy: ReportSortField,
  sortDir: SortDirection,
): Prisma.ReportOrderByWithRelationInput | Prisma.ReportOrderByWithRelationInput[] {
  switch (sortBy) {
    case "period":
      return [{ year: sortDir }, { month: sortDir }];
    case "opco":
      return { opco: { name: sortDir } };
    case "partner":
      return { partner: { name: sortDir } };
    case "uploaded":
    default:
      return { createdAt: sortDir };
  }
}

export function parseReportListFilters(
  searchParams: URLSearchParams,
): ReportListFilters {
  const fallback = currentPeriod();
  const month = Number(searchParams.get("month"));
  const year = Number(searchParams.get("year"));
  const page = Number(searchParams.get("page"));
  const sortBy = searchParams.get("sortBy");
  const sortDir = searchParams.get("sortDir");

  return {
    month:
      Number.isInteger(month) && month >= 1 && month <= 12 ? month : fallback.month,
    year:
      Number.isInteger(year) && year >= 2000 && year <= 2100 ? year : fallback.year,
    opcoId: searchParams.get("opcoId") ?? undefined,
    partnerId: searchParams.get("partnerId") ?? undefined,
    search: searchParams.get("search")?.trim() || undefined,
    sortBy:
      sortBy === "period" ||
      sortBy === "uploaded" ||
      sortBy === "opco" ||
      sortBy === "partner"
        ? sortBy
        : "uploaded",
    sortDir: sortDir === "asc" ? "asc" : "desc",
    page: Number.isInteger(page) && page >= 1 ? page : 1,
  };
}

export async function getReportFilterOptions(): Promise<ReportFilterOptions> {
  const [opcos, partners] = await Promise.all([
    prisma.opco.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.partner.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return {
    opcos: opcos.map((row) => ({ id: row.id.toString(), name: row.name })),
    partners: partners.map((row) => ({ id: row.id.toString(), name: row.name })),
  };
}

export async function listReports(
  filters: ReportListFilters,
): Promise<ReportListResult> {
  const where: Prisma.ReportWhereInput = {
    month: filters.month,
    year: filters.year,
    isDeleted: false,
  };

  if (filters.opcoId) {
    where.opcoId = BigInt(filters.opcoId);
  }
  if (filters.partnerId) {
    where.partnerId = BigInt(filters.partnerId);
  }
  if (filters.search) {
    where.OR = [
      { file: { filename: { contains: filters.search } } },
      { opco: { name: { contains: filters.search } } },
      { partner: { name: { contains: filters.search } } },
    ];
  }

  const [totalCount, rows] = await Promise.all([
    prisma.report.count({ where }),
    prisma.report.findMany({
      where,
      orderBy: buildOrderBy(filters.sortBy, filters.sortDir),
      skip: (filters.page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        opco: { select: { name: true } },
        partner: { select: { name: true } },
        status: { select: { code: true } },
        file: { select: { filename: true } },
        uploadedByUser: { select: { role: { select: { code: true } } } },
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return {
    items: rows.map((row) => ({
      id: row.id.toString(),
      period: periodFromParts(row.month, row.year),
      opcoName: row.opco.name,
      partnerName: row.partner.name,
      filename: row.file?.filename ?? null,
      uploadedAt: row.createdAt.toISOString(),
      status: row.status.code.replaceAll("_", " "),
      uploadedBy: uploadedByLabel(row.uploadedByUser?.role?.code),
    })),
    page: filters.page,
    pageSize: PAGE_SIZE,
    totalPages,
    totalCount,
    filters,
  };
}

function decimalToString(value: Prisma.Decimal | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  return value.toString();
}

export async function getReportDetail(id: string): Promise<ReportDetail | null> {
  const report = await prisma.report.findFirst({
    where: { id: BigInt(id), isDeleted: false },
    include: {
      opco: { select: { name: true } },
      partner: { select: { name: true } },
      status: { select: { code: true } },
      currency: { select: { id: true, isoCode: true } },
      file: { select: { id: true, filename: true, sizeBytes: true } },
      uploadedByUser: { select: { role: { select: { code: true } } } },
      lineItems: {
        orderBy: { lineNumber: "asc" },
        select: {
          lineNumber: true,
          description: true,
          usageAmount: true,
          usageUsd: true,
          amount: true,
          exchangeRate: true,
          usageUnit: true,
          reconciliationBasis: true,
        },
      },
    },
  });

  if (!report) {
    return null;
  }

  const fileId = report.file?.id.toString() ?? null;
  const side: ReportUploaderSide =
    report.version === PARTNER_REPORT_VERSION ? "partner" : "opco";
  const fx =
    side === "opco"
      ? await getReportFx({
          currencyId: report.currency.id,
          month: report.month,
          year: report.year,
        })
      : { currencyCode: "USD", rateToUsd: 1 };

  return {
    id: report.id.toString(),
    period: periodFromParts(report.month, report.year),
    lane: `${report.opco.name} / ${report.partner.name}`,
    opcoName: report.opco.name,
    partnerName: report.partner.name,
    uploadedBy: uploadedByLabel(report.uploadedByUser?.role?.code),
    uploadedAt: report.createdAt.toISOString(),
    status: report.status.code.replaceAll("_", " "),
    filename: report.file?.filename ?? null,
    fileSizeBytes: report.file?.sizeBytes ? Number(report.file.sizeBytes) : null,
    previewUrl: fileId ? `/api/dizlee/reports/${report.id.toString()}/preview` : null,
    lineItemCount: report.lineItems.length,
    currencyCode: fx.currencyCode,
    side,
    lineItems: report.lineItems.map((item) => {
      const localAmount = decimalToString(item.amount);
      if (side === "partner") {
        return {
          lineNumber: item.lineNumber,
          description: item.description,
          usageAmount: decimalToString(item.usageAmount),
          usageUsd: decimalToString(item.usageUsd),
          amount: localAmount,
          amountUsd: localAmount,
          exchangeRate: null,
          usageUnit: item.usageUnit,
          reconciliationBasis: item.reconciliationBasis,
        };
      }
      const converted = applyReportFxToAmount(localAmount, fx.rateToUsd);
      return {
        lineNumber: item.lineNumber,
        description: item.description,
        usageAmount: decimalToString(item.usageAmount),
        usageUsd: decimalToString(item.usageUsd),
        amount: localAmount,
        amountUsd: converted.amountUsd,
        exchangeRate: converted.exchangeRate,
        usageUnit: item.usageUnit,
        reconciliationBasis: item.reconciliationBasis,
      };
    }),
  };
}

export { PAGE_SIZE as REPORTS_PAGE_SIZE };

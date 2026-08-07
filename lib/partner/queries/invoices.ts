/**
 * Partner invoice list and detail for PARTNER_TO_DIZLEE uploads and lifecycle views.
 *
 * Portal: Partner. Scoped to `partnerId`; payment filters treat missing status as pending.
 */

import type { Prisma } from "@prisma/client";

import { formatPeriodLabel } from "@/lib/partner/period";
import prisma from "@/lib/prisma";

export type PartnerInvoiceSortField = "uploaded" | "period";
export type PartnerSortDirection = "asc" | "desc";
export type PartnerInvoicePaymentFilter = "all" | "paid" | "pending";

export type PartnerInvoiceListFilters = {
  year?: number;
  month?: number;
  statusCode?: string;
  paymentStatus: PartnerInvoicePaymentFilter;
  sortBy: PartnerInvoiceSortField;
  sortDir: PartnerSortDirection;
  page: number;
};

export type PartnerInvoiceListItem = {
  id: string;
  invoiceNumber: string | null;
  year: number;
  month: number;
  statusLabel: string;
  statusCode: string;
  paymentStatusLabel: string;
  totalAmount: number;
  currencyCode: string;
  uploadedAt: string;
  acknowledgedAt: string | null;
};

export type PartnerInvoiceListResult = {
  items: PartnerInvoiceListItem[];
  page: number;
  pageSize: number;
  totalPages: number;
  totalCount: number;
  filters: PartnerInvoiceListFilters;
};

export type PartnerInvoiceLineItem = {
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type PartnerInvoiceDetail = {
  id: string;
  invoiceNumber: string | null;
  year: number;
  month: number;
  periodLabel: string;
  statusLabel: string;
  statusCode: string;
  paymentStatusLabel: string;
  totalAmount: number;
  currencyCode: string;
  uploadedAt: string;
  acknowledgedAt: string | null;
  filename: string | null;
  previewUrl: string | null;
  lineItems: PartnerInvoiceLineItem[];
};

export type PartnerInvoiceFilterOptions = {
  statuses: Array<{ code: string; label: string }>;
};

export const PARTNER_INVOICES_PAGE_SIZE = 10;

function toNumber(value: Prisma.Decimal | number | null | undefined): number {
  if (value === null || value === undefined) {
    return 0;
  }

  return Number(value);
}

function buildOrderBy(
  sortBy: PartnerInvoiceSortField,
  sortDir: PartnerSortDirection,
): Prisma.InvoiceOrderByWithRelationInput | Prisma.InvoiceOrderByWithRelationInput[] {
  switch (sortBy) {
    case "period":
      return [{ year: sortDir }, { month: sortDir }, { createdAt: "desc" }];
    case "uploaded":
    default:
      return { createdAt: sortDir };
  }
}

function buildWhere(
  partnerId: bigint,
  filters: PartnerInvoiceListFilters,
): Prisma.InvoiceWhereInput {
  const where: Prisma.InvoiceWhereInput = {
    partnerId,
    invoiceType: { code: "PARTNER_TO_CLIENT" },
    isDeleted: false,
  };

  if (filters.year !== undefined) {
    where.year = filters.year;
  }
  if (filters.month !== undefined) {
    where.month = filters.month;
  }
  if (filters.statusCode) {
    where.invoiceStatus = { code: filters.statusCode };
  }
  if (filters.paymentStatus === "paid") {
    where.paymentStatus = { code: "PAID" };
  } else if (filters.paymentStatus === "pending") {
    where.OR = [
      { paymentStatus: { code: "UNPAID" } },
      { paymentStatus: { code: "OVERDUE" } },
      { paymentStatusId: null },
    ];
  }

  return where;
}

const invoiceDetailInclude = {
  invoiceStatus: { select: { code: true, label: true } },
  paymentStatus: { select: { code: true, label: true } },
  currency: { select: { isoCode: true } },
  file: { select: { filename: true } },
  items: {
    orderBy: { sortOrder: "asc" as const },
    select: {
      description: true,
      quantity: true,
      unitPrice: true,
      lineTotal: true,
    },
  },
} satisfies Prisma.InvoiceInclude;

function mapInvoiceDetail(
  invoice: Prisma.InvoiceGetPayload<{ include: typeof invoiceDetailInclude }>,
): PartnerInvoiceDetail {
  const invoiceId = invoice.id.toString();

  return {
    id: invoiceId,
    invoiceNumber: invoice.invoiceNumber,
    year: invoice.year,
    month: invoice.month,
    periodLabel: formatPeriodLabel(invoice.year, invoice.month),
    statusLabel: invoice.invoiceStatus.label,
    statusCode: invoice.invoiceStatus.code,
    paymentStatusLabel: invoice.paymentStatus?.label ?? "—",
    totalAmount: invoice.items.reduce((sum, item) => sum + toNumber(item.lineTotal), 0),
    currencyCode: invoice.currency.isoCode,
    uploadedAt: (invoice.sentAt ?? invoice.createdAt).toISOString(),
    acknowledgedAt: invoice.acknowledgedAt?.toISOString() ?? null,
    filename: invoice.file?.filename ?? null,
    previewUrl: invoice.file ? `/api/partner/invoices/${invoiceId}/preview` : null,
    lineItems: invoice.items.map((item) => ({
      description: item.description,
      quantity: toNumber(item.quantity),
      unitPrice: toNumber(item.unitPrice),
      lineTotal: toNumber(item.lineTotal),
    })),
  };
}

export function parsePartnerInvoiceListFilters(
  searchParams: URLSearchParams,
): PartnerInvoiceListFilters {
  const yearParam = searchParams.get("year");
  const monthParam = searchParams.get("month");
  const page = Number(searchParams.get("page"));
  const sortBy = searchParams.get("sortBy");
  const sortDir = searchParams.get("sortDir");
  const paymentStatus = searchParams.get("paymentStatus");

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

  const statusCode = searchParams.get("status")?.trim();

  return {
    year,
    month,
    statusCode: statusCode || undefined,
    paymentStatus:
      paymentStatus === "paid" || paymentStatus === "pending" ? paymentStatus : "all",
    sortBy: sortBy === "period" || sortBy === "uploaded" ? sortBy : "uploaded",
    sortDir: sortDir === "asc" ? "asc" : "desc",
    page: Number.isInteger(page) && page >= 1 ? page : 1,
  };
}

export async function getPartnerInvoiceFilterOptions(): Promise<PartnerInvoiceFilterOptions> {
  const statuses = await prisma.lookup.findMany({
    where: { lookupType: { code: "INVOICE_STATUS" } },
    orderBy: { label: "asc" },
    select: { code: true, label: true },
  });

  return { statuses };
}

export async function searchInvoicesForPartner(
  partnerId: bigint,
  filters: PartnerInvoiceListFilters,
): Promise<PartnerInvoiceListResult> {
  const where = buildWhere(partnerId, filters);

  const [totalCount, rows] = await Promise.all([
    prisma.invoice.count({ where }),
    prisma.invoice.findMany({
      where,
      orderBy: buildOrderBy(filters.sortBy, filters.sortDir),
      skip: (filters.page - 1) * PARTNER_INVOICES_PAGE_SIZE,
      take: PARTNER_INVOICES_PAGE_SIZE,
      include: {
        invoiceStatus: { select: { code: true, label: true } },
        paymentStatus: { select: { code: true, label: true } },
        currency: { select: { isoCode: true } },
        items: { select: { lineTotal: true } },
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PARTNER_INVOICES_PAGE_SIZE));

  return {
    items: rows.map((invoice) => ({
      id: invoice.id.toString(),
      invoiceNumber: invoice.invoiceNumber,
      year: invoice.year,
      month: invoice.month,
      statusLabel: invoice.invoiceStatus.label,
      statusCode: invoice.invoiceStatus.code,
      paymentStatusLabel: invoice.paymentStatus?.label ?? "—",
      totalAmount: invoice.items.reduce((sum, item) => sum + toNumber(item.lineTotal), 0),
      currencyCode: invoice.currency.isoCode,
      uploadedAt: (invoice.sentAt ?? invoice.createdAt).toISOString(),
      acknowledgedAt: invoice.acknowledgedAt?.toISOString() ?? null,
    })),
    page: filters.page,
    pageSize: PARTNER_INVOICES_PAGE_SIZE,
    totalPages,
    totalCount,
    filters,
  };
}

export async function getPartnerInvoiceDetail(
  partnerId: bigint,
  invoiceId: bigint,
): Promise<PartnerInvoiceDetail | null> {
  const invoice = await prisma.invoice.findFirst({
    where: {
      id: invoiceId,
      partnerId,
      invoiceType: { code: "PARTNER_TO_CLIENT" },
      isDeleted: false,
    },
    include: invoiceDetailInclude,
  });

  if (!invoice) {
    return null;
  }

  return mapInvoiceDetail(invoice);
}

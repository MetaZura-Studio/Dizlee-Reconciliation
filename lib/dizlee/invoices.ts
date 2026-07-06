import type { Prisma } from "@prisma/client";

import { currentPeriod, type DashboardPeriod } from "@/lib/dizlee/dashboard";
import { prisma } from "@/lib/prisma";

export type InvoiceSortField = "uploaded" | "period";
export type SortDirection = "asc" | "desc";
export type PaymentStatusFilter = "all" | "paid" | "pending";

export type InvoiceListFilters = {
  month: number;
  year: number;
  opcoId?: string;
  partnerId?: string;
  paymentStatus: PaymentStatusFilter;
  sortBy: InvoiceSortField;
  sortDir: SortDirection;
  page: number;
};

export type InvoiceListItem = {
  id: string;
  invoiceNumber: string | null;
  period: DashboardPeriod;
  opcoName: string;
  partnerName: string | null;
  direction: string;
  invoiceStatus: string;
  paymentStatus: string;
  uploadedAt: string;
  totalAmount: number;
  currencyCode: string;
};

export type InvoiceListResult = {
  items: InvoiceListItem[];
  page: number;
  pageSize: number;
  totalPages: number;
  totalCount: number;
  filters: InvoiceListFilters;
};

export type InvoiceLineItemView = {
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type InvoiceDetail = {
  id: string;
  invoiceNumber: string | null;
  period: DashboardPeriod;
  opcoName: string;
  partnerName: string | null;
  direction: string;
  invoiceStatus: string;
  paymentStatus: string;
  uploadedAt: string;
  totalAmount: number;
  currencyCode: string;
  filename: string | null;
  fileSizeBytes: number | null;
  previewUrl: string | null;
  isDigital: boolean;
  lineItems: InvoiceLineItemView[];
};

export type InvoiceFilterOptions = {
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

function directionLabel(typeCode: string): string {
  switch (typeCode) {
    case "CLIENT_TO_OPCO":
      return "Dizlee → OpCo";
    case "PARTNER_TO_CLIENT":
      return "Partner → Dizlee";
    default:
      return typeCode.replaceAll("_", " ");
  }
}

function toNumber(value: unknown): number {
  if (value === null || value === undefined) {
    return 0;
  }
  return Number(value as never);
}

function buildOrderBy(
  sortBy: InvoiceSortField,
  sortDir: SortDirection,
): Prisma.InvoiceOrderByWithRelationInput | Prisma.InvoiceOrderByWithRelationInput[] {
  switch (sortBy) {
    case "period":
      return [{ year: sortDir }, { month: sortDir }];
    case "uploaded":
    default:
      return { createdAt: sortDir };
  }
}

export function parseInvoiceListFilters(
  searchParams: URLSearchParams,
): InvoiceListFilters {
  const fallback = currentPeriod();
  const month = Number(searchParams.get("month"));
  const year = Number(searchParams.get("year"));
  const page = Number(searchParams.get("page"));
  const sortBy = searchParams.get("sortBy");
  const sortDir = searchParams.get("sortDir");
  const paymentStatus = searchParams.get("paymentStatus");

  return {
    month:
      Number.isInteger(month) && month >= 1 && month <= 12 ? month : fallback.month,
    year:
      Number.isInteger(year) && year >= 2000 && year <= 2100 ? year : fallback.year,
    opcoId: searchParams.get("opcoId") ?? undefined,
    partnerId: searchParams.get("partnerId") ?? undefined,
    paymentStatus:
      paymentStatus === "paid" || paymentStatus === "pending"
        ? paymentStatus
        : "all",
    sortBy: sortBy === "period" || sortBy === "uploaded" ? sortBy : "uploaded",
    sortDir: sortDir === "asc" ? "asc" : "desc",
    page: Number.isInteger(page) && page >= 1 ? page : 1,
  };
}

export async function getInvoiceFilterOptions(): Promise<InvoiceFilterOptions> {
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

export async function listInvoices(
  filters: InvoiceListFilters,
): Promise<InvoiceListResult> {
  const where: Prisma.InvoiceWhereInput = {
    month: filters.month,
    year: filters.year,
  };

  if (filters.opcoId) {
    where.opcoId = BigInt(filters.opcoId);
  }
  if (filters.partnerId) {
    where.partnerId = BigInt(filters.partnerId);
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

  const [totalCount, rows] = await Promise.all([
    prisma.invoice.count({ where }),
    prisma.invoice.findMany({
      where,
      orderBy: buildOrderBy(filters.sortBy, filters.sortDir),
      skip: (filters.page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        opco: { select: { name: true } },
        partner: { select: { name: true } },
        invoiceType: { select: { code: true } },
        invoiceStatus: { select: { code: true } },
        paymentStatus: { select: { code: true } },
        currency: { select: { isoCode: true } },
        items: { select: { lineTotal: true } },
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return {
    items: rows.map((row) => ({
      id: row.id.toString(),
      invoiceNumber: row.invoiceNumber,
      period: periodFromParts(row.month, row.year),
      opcoName: row.opco.name,
      partnerName: row.partner?.name ?? null,
      direction: directionLabel(row.invoiceType.code),
      invoiceStatus: row.invoiceStatus.code.replaceAll("_", " "),
      paymentStatus: row.paymentStatus?.code.replaceAll("_", " ") ?? "—",
      uploadedAt: row.createdAt.toISOString(),
      totalAmount: row.items.reduce((sum, item) => sum + toNumber(item.lineTotal), 0),
      currencyCode: row.currency.isoCode,
    })),
    page: filters.page,
    pageSize: PAGE_SIZE,
    totalPages,
    totalCount,
    filters,
  };
}

export async function getInvoiceDetail(id: string): Promise<InvoiceDetail | null> {
  const invoice = await prisma.invoice.findFirst({
    where: { id: BigInt(id) },
    include: {
      opco: { select: { name: true } },
      partner: { select: { name: true } },
      invoiceType: { select: { code: true } },
      invoiceStatus: { select: { code: true } },
      paymentStatus: { select: { code: true } },
      currency: { select: { isoCode: true } },
      file: { select: { id: true, filename: true, sizeBytes: true } },
      items: {
        orderBy: { sortOrder: "asc" },
        select: {
          description: true,
          quantity: true,
          unitPrice: true,
          lineTotal: true,
        },
      },
    },
  });

  if (!invoice) {
    return null;
  }

  const isDigital = invoice.invoiceType.code === "CLIENT_TO_OPCO";
  const hasFile = Boolean(invoice.file);

  return {
    id: invoice.id.toString(),
    invoiceNumber: invoice.invoiceNumber,
    period: periodFromParts(invoice.month, invoice.year),
    opcoName: invoice.opco.name,
    partnerName: invoice.partner?.name ?? null,
    direction: directionLabel(invoice.invoiceType.code),
    invoiceStatus: invoice.invoiceStatus.code.replaceAll("_", " "),
    paymentStatus: invoice.paymentStatus?.code.replaceAll("_", " ") ?? "—",
    uploadedAt: invoice.createdAt.toISOString(),
    totalAmount: invoice.items.reduce((sum, item) => sum + toNumber(item.lineTotal), 0),
    currencyCode: invoice.currency.isoCode,
    filename: invoice.file?.filename ?? null,
    fileSizeBytes: invoice.file?.sizeBytes ? Number(invoice.file.sizeBytes) : null,
    previewUrl: hasFile
      ? `/api/dizlee/invoices/${invoice.id.toString()}/preview`
      : null,
    isDigital,
    lineItems: invoice.items.map((item) => ({
      description: item.description,
      quantity: toNumber(item.quantity),
      unitPrice: toNumber(item.unitPrice),
      lineTotal: toNumber(item.lineTotal),
    })),
  };
}

export { PAGE_SIZE as INVOICES_PAGE_SIZE };

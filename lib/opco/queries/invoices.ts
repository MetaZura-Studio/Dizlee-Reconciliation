import type { Prisma } from "@prisma/client";

import {
  parseInvoiceBankDetailsJson,
  parseInvoiceSignatoriesJson,
  type InvoiceBankDetails,
} from "@/lib/dizlee/invoice-bank-details";
import { getOpcoLookupId } from "@/lib/opco/lookups";
import { shouldAutoAcknowledgeOpcoInvoice } from "@/lib/opco/invoices/acknowledgement";
import { formatPeriodLabel } from "@/lib/opco/period";
import prisma from "@/lib/prisma";

export type OpcoInvoiceSortField = "uploaded" | "period";
export type OpcoSortDirection = "asc" | "desc";
export type OpcoInvoicePaymentFilter = "all" | "paid" | "pending";

export type OpcoInvoiceListFilters = {
  year?: number;
  month?: number;
  statusCode?: string;
  paymentStatus: OpcoInvoicePaymentFilter;
  search?: string;
  sortBy: OpcoInvoiceSortField;
  sortDir: OpcoSortDirection;
  page: number;
};

export type OpcoInvoiceListItem = {
  id: string;
  invoiceNumber: string | null;
  partnerName: string | null;
  year: number;
  month: number;
  statusLabel: string;
  statusCode: string;
  paymentStatusLabel: string;
  totalAmount: number;
  currencyCode: string;
  issuedAt: string;
  acknowledgedAt: string | null;
};

export type OpcoInvoiceListResult = {
  items: OpcoInvoiceListItem[];
  page: number;
  pageSize: number;
  totalPages: number;
  totalCount: number;
  filters: OpcoInvoiceListFilters;
};

export type OpcoInvoiceLineItem = {
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type OpcoInvoiceDetail = {
  id: string;
  invoiceNumber: string | null;
  opcoName: string;
  partnerName: string | null;
  year: number;
  month: number;
  periodLabel: string;
  statusLabel: string;
  statusCode: string;
  paymentStatusLabel: string;
  totalAmount: number;
  currencyCode: string;
  issuedAt: string;
  acknowledgedAt: string | null;
  bankDetails: InvoiceBankDetails | null;
  preparedBy: string | null;
  approvedBy: string | null;
  lineItems: OpcoInvoiceLineItem[];
};

export type OpcoInvoiceFilterOptions = {
  statuses: Array<{ code: string; label: string }>;
};

export const OPCO_INVOICES_PAGE_SIZE = 10;

function toNumber(value: Prisma.Decimal | number | null | undefined): number {
  if (value === null || value === undefined) {
    return 0;
  }

  return Number(value);
}

function buildOrderBy(
  sortBy: OpcoInvoiceSortField,
  sortDir: OpcoSortDirection,
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
  opcoId: bigint,
  filters: OpcoInvoiceListFilters,
): Prisma.InvoiceWhereInput {
  const where: Prisma.InvoiceWhereInput = {
    opcoId,
    invoiceType: { code: "CLIENT_TO_OPCO" },
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
  if (filters.search) {
    where.invoiceNumber = { contains: filters.search };
  }

  return where;
}

function mapInvoiceDetail(
  invoice: Prisma.InvoiceGetPayload<{
    include: {
      opco: { select: { name: true } };
      partner: { select: { name: true } };
      invoiceStatus: { select: { code: true; label: true } };
      paymentStatus: { select: { code: true; label: true } };
      currency: { select: { isoCode: true } };
      items: {
        orderBy: { sortOrder: "asc" };
        select: {
          description: true;
          quantity: true;
          unitPrice: true;
          lineTotal: true;
        };
      };
    };
  }>,
): OpcoInvoiceDetail {
  const signatories = parseInvoiceSignatoriesJson(invoice.bankDetailsJson);
  return {
    id: invoice.id.toString(),
    invoiceNumber: invoice.invoiceNumber,
    opcoName: invoice.opco.name,
    partnerName: invoice.partner?.name ?? null,
    year: invoice.year,
    month: invoice.month,
    periodLabel: formatPeriodLabel(invoice.year, invoice.month),
    statusLabel: invoice.invoiceStatus.label,
    statusCode: invoice.invoiceStatus.code,
    paymentStatusLabel: invoice.paymentStatus?.label ?? "—",
    totalAmount: invoice.items.reduce((sum, item) => sum + toNumber(item.lineTotal), 0),
    currencyCode: invoice.currency.isoCode,
    issuedAt: (invoice.sentAt ?? invoice.createdAt).toISOString(),
    acknowledgedAt: invoice.acknowledgedAt?.toISOString() ?? null,
    bankDetails: parseInvoiceBankDetailsJson(invoice.bankDetailsJson),
    preparedBy: signatories.preparedBy,
    approvedBy: signatories.approvedBy,
    lineItems: invoice.items.map((item) => ({
      description: item.description,
      quantity: toNumber(item.quantity),
      unitPrice: toNumber(item.unitPrice),
      lineTotal: toNumber(item.lineTotal),
    })),
  };
}

export function parseOpcoInvoiceListFilters(
  searchParams: URLSearchParams,
): OpcoInvoiceListFilters {
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
  const search = searchParams.get("search")?.trim();

  return {
    year,
    month,
    statusCode: statusCode || undefined,
    paymentStatus:
      paymentStatus === "paid" || paymentStatus === "pending" ? paymentStatus : "all",
    search: search || undefined,
    sortBy: sortBy === "period" || sortBy === "uploaded" ? sortBy : "uploaded",
    sortDir: sortDir === "asc" ? "asc" : "desc",
    page: Number.isInteger(page) && page >= 1 ? page : 1,
  };
}

export async function getOpcoInvoiceFilterOptions(): Promise<OpcoInvoiceFilterOptions> {
  const statuses = await prisma.lookup.findMany({
    where: { lookupType: { code: "INVOICE_STATUS" } },
    orderBy: { label: "asc" },
    select: { code: true, label: true },
  });

  return { statuses };
}

export async function searchInvoicesForOpco(
  opcoId: bigint,
  filters: OpcoInvoiceListFilters,
): Promise<OpcoInvoiceListResult> {
  const where = buildWhere(opcoId, filters);

  const [totalCount, rows] = await Promise.all([
    prisma.invoice.count({ where }),
    prisma.invoice.findMany({
      where,
      orderBy: buildOrderBy(filters.sortBy, filters.sortDir),
      skip: (filters.page - 1) * OPCO_INVOICES_PAGE_SIZE,
      take: OPCO_INVOICES_PAGE_SIZE,
      include: {
        partner: { select: { name: true } },
        invoiceStatus: { select: { code: true, label: true } },
        paymentStatus: { select: { code: true, label: true } },
        currency: { select: { isoCode: true } },
        items: { select: { lineTotal: true } },
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / OPCO_INVOICES_PAGE_SIZE));

  return {
    items: rows.map((invoice) => ({
      id: invoice.id.toString(),
      invoiceNumber: invoice.invoiceNumber,
      partnerName: invoice.partner?.name ?? null,
      year: invoice.year,
      month: invoice.month,
      statusLabel: invoice.invoiceStatus.label,
      statusCode: invoice.invoiceStatus.code,
      paymentStatusLabel: invoice.paymentStatus?.label ?? "—",
      totalAmount: invoice.items.reduce((sum, item) => sum + toNumber(item.lineTotal), 0),
      currencyCode: invoice.currency.isoCode,
      issuedAt: (invoice.sentAt ?? invoice.createdAt).toISOString(),
      acknowledgedAt: invoice.acknowledgedAt?.toISOString() ?? null,
    })),
    page: filters.page,
    pageSize: OPCO_INVOICES_PAGE_SIZE,
    totalPages,
    totalCount,
    filters,
  };
}

async function maybeAcknowledgeOpcoInvoice(
  invoiceId: bigint,
  opcoId: bigint,
  actorUserId: bigint,
): Promise<boolean> {
  const invoice = await prisma.invoice.findFirst({
    where: {
      id: invoiceId,
      opcoId,
      invoiceType: { code: "CLIENT_TO_OPCO" },
    },
    include: {
      invoiceType: { select: { code: true } },
      invoiceStatus: { select: { code: true } },
    },
  });

  if (!invoice) {
    return false;
  }

  if (
    !shouldAutoAcknowledgeOpcoInvoice(
      invoice.invoiceType.code,
      invoice.invoiceStatus.code,
    )
  ) {
    return false;
  }

  const [acknowledgedStatusId, actionId] = await Promise.all([
    getOpcoLookupId("INVOICE_STATUS", "ACKNOWLEDGED"),
    getOpcoLookupId("AUDIT_ACTION", "INVOICE_STATUS_UPDATED"),
  ]);

  const now = new Date();

  await prisma.$transaction([
    prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        invoiceStatusId: acknowledgedStatusId,
        acknowledgedAt: now,
        updatedByUserId: actorUserId,
      },
    }),
    prisma.invoiceActivityLog.create({
      data: {
        invoiceId: invoice.id,
        actorUserId,
        actionId,
        statusField: "invoice_status",
        previousStatus: "SENT",
        newStatus: "ACKNOWLEDGED",
      },
    }),
  ]);

  return true;
}

const invoiceDetailInclude = {
  opco: { select: { name: true } },
  partner: { select: { name: true } },
  invoiceStatus: { select: { code: true, label: true } },
  paymentStatus: { select: { code: true, label: true } },
  currency: { select: { isoCode: true } },
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

export async function getOpcoInvoiceDetailForOpco(
  opcoId: bigint,
  invoiceId: bigint,
): Promise<OpcoInvoiceDetail | null> {
  const invoice = await prisma.invoice.findFirst({
    where: {
      id: invoiceId,
      opcoId,
      invoiceType: { code: "CLIENT_TO_OPCO" },
    },
    include: invoiceDetailInclude,
  });

  if (!invoice) {
    return null;
  }

  return mapInvoiceDetail(invoice);
}

export async function getOpcoInvoiceDetailForViewer(
  opcoId: bigint,
  invoiceId: bigint,
  viewerUserId: bigint,
): Promise<{ detail: OpcoInvoiceDetail; acknowledged: boolean } | null> {
  const acknowledged = await maybeAcknowledgeOpcoInvoice(
    invoiceId,
    opcoId,
    viewerUserId,
  );

  const invoice = await prisma.invoice.findFirst({
    where: {
      id: invoiceId,
      opcoId,
      invoiceType: { code: "CLIENT_TO_OPCO" },
    },
    include: invoiceDetailInclude,
  });

  if (!invoice) {
    return null;
  }

  return {
    detail: mapInvoiceDetail(invoice),
    acknowledged,
  };
}

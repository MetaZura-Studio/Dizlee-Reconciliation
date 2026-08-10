/**
 * Dizlee invoice operations: list/detail queries, digital send to OpCo, and status semantics.
 * Consumed by invoices UI, lifecycle monitoring, and dashboard billing sections.
 * Paid payment status overrides display status; legacy SETTLED maps to PAID for operators.
 */

import type { Prisma } from "@prisma/client";

import { currentPeriod, type DashboardPeriod } from "@/lib/dizlee/dashboard";
import {
  findBankAccountById,
  getInvoiceBankAccounts,
  parseInvoiceBankDetailsJson,
  parseInvoiceSignatoriesJson,
  serializeInvoiceBankDetailsSnapshot,
  type InvoiceBankAccount,
  type InvoiceBankDetails,
} from "@/lib/dizlee/invoice-bank-details";
import { getLookupId } from "@/lib/dizlee/lookups";
import {
  BASE_CURRENCY_ISO_CODE,
  BASE_CURRENCY_RATE,
  getMonthlyRatesForPeriod,
} from "@/lib/platform/currency-rates";
import { prisma } from "@/lib/prisma";
import { isFuturePeriod } from "@/lib/platform/period";
import { notifyOpcoUsers } from "@/lib/platform/notify-opco";
import { DomainError } from "@/lib/errors/app-error";

export type InvoiceSortField = "uploaded" | "period" | "opco" | "partner";
export type SortDirection = "asc" | "desc";
export type PaymentStatusFilter = "all" | "paid" | "pending";

export type InvoiceListFilters = {
  month: number;
  year: number;
  opcoId?: string;
  partnerId?: string;
  paymentStatus: PaymentStatusFilter;
  search?: string;
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
  invoiceTypeCode: string;
  invoiceStatus: string;
  paymentStatus: string;
  uploadedAt: string;
  acknowledgedAt: string | null;
  paidAt: string | null;
  totalAmount: number;
  currencyCode: string;
  filename: string | null;
  fileSizeBytes: number | null;
  previewUrl: string | null;
  isDigital: boolean;
  bankDetails: InvoiceBankDetails | null;
  preparedBy: string | null;
  approvedBy: string | null;
  canMarkPayment: boolean;
  lineItems: InvoiceLineItemView[];
};

export type CreateOpcoInvoiceLineInput = {
  description: string;
  quantity: number;
  unitPrice: number;
};

export type CreateOpcoInvoiceInput = {
  month: number;
  year: number;
  opcoId: string;
  currencyId?: string;
  bankAccountId?: string;
  preparedBy?: string;
  approvedBy?: string;
  lineItems: CreateOpcoInvoiceLineInput[];
};

export type CreateOpcoInvoiceFormOptions = {
  opcos: Array<{ id: string; name: string; defaultCurrencyId: string }>;
  currencies: Array<{ id: string; isoCode: string; symbol: string | null }>;
  bankAccounts: InvoiceBankAccount[];
  /** Period FX rates (local → USD). Used for dual-currency PDF preview; not persisted yet. */
  fxRates: Array<{ currencyId: string; rateToUsd: number }>;
  fxPeriod: { month: number; year: number };
};

export class InvoiceActionError extends DomainError {
  constructor(keyOrMessage: string, status?: number) {
    super("InvoiceActionError", keyOrMessage, status);
  }
}

export type InvoiceDetailResult = {
  detail: InvoiceDetail;
  acknowledged: boolean;
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

function formatStatusLabel(code: string): string {
  return code.replaceAll("_", " ");
}

/** Prefer Paid when payment is collected, even if invoice status was left on Acknowledged. */
export function effectiveInvoiceStatusCode(
  invoiceStatusCode: string,
  paymentStatusCode: string | null | undefined,
): string {
  if (paymentStatusCode === "PAID") {
    return "PAID";
  }
  if (invoiceStatusCode === "SETTLED") {
    return "PAID";
  }
  return invoiceStatusCode;
}

function toNumber(value: unknown): number {
  if (value === null || value === undefined) {
    return 0;
  }
  return Number(value as never);
}

async function ensureInvoiceStatusPaidLookupId(): Promise<number> {
  const existing = await prisma.lookup.findFirst({
    where: {
      code: "PAID",
      lookupType: { code: "INVOICE_STATUS" },
    },
    select: { id: true },
  });
  if (existing) {
    return existing.id;
  }

  const lookupType = await prisma.lookupType.findFirst({
    where: { code: "INVOICE_STATUS" },
    select: { id: true },
  });
  if (!lookupType) {
    throw new InvoiceActionError("Invoice status lookups are not configured.", 500);
  }

  const created = await prisma.lookup.create({
    data: {
      lookupTypeId: lookupType.id,
      code: "PAID",
      label: "Paid",
      sortOrder: 3,
    },
    select: { id: true },
  });
  return created.id;
}

/** Align invoice_status to PAID when payment is already PAID (legacy rows). */
export async function syncInvoiceStatusWhenPaid(invoiceId: bigint): Promise<void> {
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId },
    select: {
      id: true,
      invoiceStatus: { select: { code: true } },
      paymentStatus: { select: { code: true } },
    },
  });
  if (!invoice) {
    return;
  }
  if (invoice.paymentStatus?.code !== "PAID") {
    return;
  }
  if (
    invoice.invoiceStatus.code === "PAID" ||
    invoice.invoiceStatus.code === "SETTLED"
  ) {
    return;
  }

  const paidInvoiceStatusId = await ensureInvoiceStatusPaidLookupId();
  await prisma.invoice.update({
    where: { id: invoice.id },
    data: { invoiceStatusId: paidInvoiceStatusId },
  });
}

function buildOrderBy(
  sortBy: InvoiceSortField,
  sortDir: SortDirection,
): Prisma.InvoiceOrderByWithRelationInput | Prisma.InvoiceOrderByWithRelationInput[] {
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

export async function getCreateOpcoInvoiceFormOptions(params?: {
  month?: number;
  year?: number;
}): Promise<CreateOpcoInvoiceFormOptions> {
  const now = currentPeriod();
  const month = params?.month ?? now.month;
  const year = params?.year ?? now.year;

  const [opcos, currencies, bankAccounts, fxRates] = await Promise.all([
    prisma.opco.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, defaultCurrencyId: true },
    }),
    prisma.currency.findMany({
      orderBy: { isoCode: "asc" },
      select: { id: true, isoCode: true, symbol: true },
    }),
    getInvoiceBankAccounts(),
    getMonthlyRatesForPeriod(month, year),
  ]);

  const ratesByCurrencyId = new Map(
    fxRates.map((rate) => [rate.currencyId, rate.rateToUsd]),
  );

  // Ensure USD always has rate 1 even if missing from the period table.
  for (const currency of currencies) {
    if (
      currency.isoCode === BASE_CURRENCY_ISO_CODE &&
      !ratesByCurrencyId.has(currency.id.toString())
    ) {
      ratesByCurrencyId.set(currency.id.toString(), BASE_CURRENCY_RATE);
    }
  }

  return {
    opcos: opcos.map((row) => ({
      id: row.id.toString(),
      name: row.name,
      defaultCurrencyId: row.defaultCurrencyId.toString(),
    })),
    currencies: currencies.map((row) => ({
      id: row.id.toString(),
      isoCode: row.isoCode,
      symbol: row.symbol,
    })),
    bankAccounts,
    fxRates: [...ratesByCurrencyId.entries()].map(([currencyId, rateToUsd]) => ({
      currencyId,
      rateToUsd,
    })),
    fxPeriod: { month, year },
  };
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function buildInvoiceNumber(
  opcoId: bigint,
  month: number,
  year: number,
): string {
  return `INV-${year}${String(month).padStart(2, "0")}-${opcoId.toString()}-${Date.now()}`;
}

function validateCreateInput(input: CreateOpcoInvoiceInput): CreateOpcoInvoiceLineInput[] {
  if (!Number.isInteger(input.month) || input.month < 1 || input.month > 12) {
    throw new InvoiceActionError("Invalid invoice period month.");
  }
  if (!Number.isInteger(input.year) || input.year < 2000 || input.year > 2100) {
    throw new InvoiceActionError("Invalid invoice period year.");
  }
  if (isFuturePeriod(input.year, input.month)) {
    throw new InvoiceActionError("Invoice period cannot be in the future.");
  }
  if (!input.opcoId) {
    throw new InvoiceActionError("OpCo is required.");
  }
  if (!Array.isArray(input.lineItems) || input.lineItems.length === 0) {
    throw new InvoiceActionError("At least one line item is required.");
  }

  return input.lineItems.map((item, index) => {
    const description = item.description?.trim();
    if (!description) {
      throw new InvoiceActionError(`Line item ${index + 1} description is required.`);
    }
    if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
      throw new InvoiceActionError(`Line item ${index + 1} quantity must be greater than 0.`);
    }
    if (!Number.isFinite(item.unitPrice) || item.unitPrice < 0) {
      throw new InvoiceActionError(`Line item ${index + 1} unit price must be 0 or greater.`);
    }
    return {
      description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    };
  });
}

export async function createOpcoInvoice(
  input: CreateOpcoInvoiceInput,
  actorUserId: string,
): Promise<InvoiceDetail> {
  const lineItems = validateCreateInput(input);
  const actorId = BigInt(actorUserId);
  const opcoId = BigInt(input.opcoId);

  const opco = await prisma.opco.findFirst({
    where: { id: opcoId },
    select: { id: true, defaultCurrencyId: true },
  });
  if (!opco) {
    throw new InvoiceActionError("OpCo not found.", 404);
  }

  const currencyId = input.currencyId
    ? BigInt(input.currencyId)
    : opco.defaultCurrencyId;

  const currency = await prisma.currency.findFirst({
    where: { id: currencyId },
    select: { id: true },
  });
  if (!currency) {
    throw new InvoiceActionError("Currency not found.", 404);
  }

  const [invoiceTypeId, sentStatusId, unpaidStatusId, actionId] = await Promise.all([
    getLookupId("INVOICE_TYPE", "CLIENT_TO_OPCO"),
    getLookupId("INVOICE_STATUS", "SENT"),
    getLookupId("PAYMENT_STATUS", "UNPAID"),
    getLookupId("AUDIT_ACTION", "INVOICE_STATUS_UPDATED"),
  ]);

  const duplicate = await prisma.invoice.findFirst({
    where: {
      opcoId,
      partnerId: null,
      month: input.month,
      year: input.year,
      invoiceTypeId,
    },
    select: { id: true },
  });
  if (duplicate) {
    throw new InvoiceActionError(
      "An invoice for this OpCo and period already exists.",
      409,
    );
  }

  const bankAccounts = await getInvoiceBankAccounts();
  const selectedBank = findBankAccountById(bankAccounts, input.bankAccountId);
  if (bankAccounts.length > 1 && !selectedBank) {
    throw new InvoiceActionError("Select a bank account for this invoice.");
  }
  const preparedBy = input.preparedBy?.trim() || null;
  const approvedBy = input.approvedBy?.trim() || null;
  const bankDetailsJson = selectedBank
    ? serializeInvoiceBankDetailsSnapshot(selectedBank, {
        preparedBy,
        approvedBy,
      })
    : preparedBy || approvedBy
      ? JSON.stringify({ preparedBy, approvedBy })
      : null;

  const now = new Date();
  const invoiceNumber = buildInvoiceNumber(opcoId, input.month, input.year);

  const invoice = await prisma.invoice.create({
    data: {
      invoiceNumber,
      month: input.month,
      year: input.year,
      opcoId,
      partnerId: null,
      invoiceTypeId,
      currencyId,
      bankDetailsJson,
      invoiceStatusId: sentStatusId,
      paymentStatusId: unpaidStatusId,
      sentAt: now,
      createdByUserId: actorId,
      updatedByUserId: actorId,
      items: {
        create: lineItems.map((item, index) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineTotal: roundMoney(item.quantity * item.unitPrice),
          sortOrder: index,
          createdByUserId: actorId,
          updatedByUserId: actorId,
        })),
      },
    },
    select: { id: true },
  });

  await prisma.invoiceActivityLog.create({
    data: {
      invoiceId: invoice.id,
      actorUserId: actorId,
      actionId,
      statusField: "invoice_status",
      previousStatus: "DRAFT",
      newStatus: "SENT",
    },
  });

  const detail = await getInvoiceDetail(invoice.id.toString());
  if (!detail) {
    throw new InvoiceActionError("Failed to load created invoice.", 500);
  }

  await notifyOpcoUsers({
    opcoId,
    fromUserId: actorId,
    subject: "Invoice received from Dizlee",
    body: `Dizlee sent invoice ${detail.invoiceNumber ?? `#${detail.id}`} for ${detail.period.label}. Total ${new Intl.NumberFormat(
      "en-US",
      {
        style: "currency",
        currency: detail.currencyCode,
        maximumFractionDigits: 2,
      },
    ).format(detail.totalAmount)}.`,
  });

  return detail;
}

export async function markInvoicePaymentDone(
  invoiceId: string,
  actorUserId: string,
): Promise<InvoiceDetail> {
  const invoice = await prisma.invoice.findFirst({
    where: { id: BigInt(invoiceId) },
    include: {
      invoiceType: { select: { code: true } },
      invoiceStatus: { select: { code: true } },
      paymentStatus: { select: { code: true } },
    },
  });

  if (!invoice) {
    throw new InvoiceActionError("Invoice not found.", 404);
  }
  if (
    invoice.invoiceType.code !== "CLIENT_TO_OPCO" &&
    invoice.invoiceType.code !== "PARTNER_TO_CLIENT"
  ) {
    throw new InvoiceActionError(
      "Only Dizlee → OpCo or Partner → Dizlee invoices can be marked paid.",
    );
  }
  if (invoice.paymentStatus?.code === "PAID") {
    throw new InvoiceActionError("Invoice is already marked as paid.");
  }

  const [paidPaymentStatusId, paidInvoiceStatusId, paymentActionId, statusActionId] =
    await Promise.all([
      getLookupId("PAYMENT_STATUS", "PAID"),
      ensureInvoiceStatusPaidLookupId(),
      getLookupId("AUDIT_ACTION", "INVOICE_PAYMENT_RECORDED"),
      getLookupId("AUDIT_ACTION", "INVOICE_STATUS_UPDATED"),
    ]);

  const now = new Date();
  const actorId = BigInt(actorUserId);
  const previousPaymentStatus = invoice.paymentStatus?.code ?? "UNPAID";
  const previousInvoiceStatus = invoice.invoiceStatus.code;

  const ops = [
    prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        paymentStatusId: paidPaymentStatusId,
        invoiceStatusId: paidInvoiceStatusId,
        paidAt: now,
        settledAt: now,
        updatedByUserId: actorId,
      },
    }),
    prisma.invoiceActivityLog.create({
      data: {
        invoiceId: invoice.id,
        actorUserId: actorId,
        actionId: paymentActionId,
        statusField: "payment_status",
        previousStatus: previousPaymentStatus,
        newStatus: "PAID",
      },
    }),
  ];

  if (previousInvoiceStatus !== "PAID" && previousInvoiceStatus !== "SETTLED") {
    ops.push(
      prisma.invoiceActivityLog.create({
        data: {
          invoiceId: invoice.id,
          actorUserId: actorId,
          actionId: statusActionId,
          statusField: "invoice_status",
          previousStatus: previousInvoiceStatus,
          newStatus: "PAID",
        },
      }),
    );
  }

  await prisma.$transaction(ops);

  const detail = await getInvoiceDetail(invoiceId);
  if (!detail) {
    throw new InvoiceActionError("Failed to load updated invoice.", 500);
  }
  return detail;
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

  const andClauses: Prisma.InvoiceWhereInput[] = [];

  if (filters.paymentStatus === "paid") {
    andClauses.push({ paymentStatus: { code: "PAID" } });
  } else if (filters.paymentStatus === "pending") {
    andClauses.push({
      OR: [
        { paymentStatus: { code: "UNPAID" } },
        { paymentStatus: { code: "OVERDUE" } },
        { paymentStatusId: null },
      ],
    });
  }

  if (filters.search) {
    andClauses.push({
      OR: [
        { invoiceNumber: { contains: filters.search } },
        { opco: { name: { contains: filters.search } } },
        { partner: { name: { contains: filters.search } } },
      ],
    });
  }

  if (andClauses.length > 0) {
    where.AND = andClauses;
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
      opcoName: row.opco?.name ?? "—",
      partnerName: row.partner?.name ?? null,
      direction: directionLabel(row.invoiceType.code),
      invoiceStatus: formatStatusLabel(
        effectiveInvoiceStatusCode(
          row.invoiceStatus.code,
          row.paymentStatus?.code,
        ),
      ),
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

  let bankDetails: InvoiceBankDetails | null = null;
  if (invoice.invoiceType.code === "CLIENT_TO_OPCO") {
    bankDetails = parseInvoiceBankDetailsJson(invoice.bankDetailsJson);
    if (!bankDetails) {
      const accounts = await getInvoiceBankAccounts();
      bankDetails = accounts[0]
        ? {
            bankName: accounts[0].bankName,
            accountName: accounts[0].accountName,
            accountNumber: accounts[0].accountNumber,
            iban: accounts[0].iban,
            swift: accounts[0].swift,
            reference: accounts[0].reference,
          }
        : null;
    }
  }

  return mapInvoiceDetail(invoice, bankDetails);
}

export async function getInvoiceDetailForViewer(
  id: string,
  viewerUserId: string,
): Promise<InvoiceDetailResult | null> {
  const acknowledged = await maybeAcknowledgePartnerInvoice(id, viewerUserId);
  const detail = await getInvoiceDetail(id);
  if (!detail) {
    return null;
  }
  return { detail, acknowledged };
}

async function maybeAcknowledgePartnerInvoice(
  invoiceId: string,
  actorUserId: string,
): Promise<boolean> {
  const invoice = await prisma.invoice.findFirst({
    where: { id: BigInt(invoiceId) },
    include: {
      invoiceType: { select: { code: true } },
      invoiceStatus: { select: { code: true } },
    },
  });

  if (!invoice) {
    return false;
  }
  if (invoice.invoiceType.code !== "PARTNER_TO_CLIENT") {
    return false;
  }
  if (invoice.invoiceStatus.code !== "SENT") {
    return false;
  }

  const [acknowledgedStatusId, actionId] = await Promise.all([
    getLookupId("INVOICE_STATUS", "ACKNOWLEDGED"),
    getLookupId("AUDIT_ACTION", "INVOICE_STATUS_UPDATED"),
  ]);

  const now = new Date();
  const actorId = BigInt(actorUserId);

  await prisma.$transaction([
    prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        invoiceStatusId: acknowledgedStatusId,
        acknowledgedAt: now,
        updatedByUserId: actorId,
      },
    }),
    prisma.invoiceActivityLog.create({
      data: {
        invoiceId: invoice.id,
        actorUserId: actorId,
        actionId,
        statusField: "invoice_status",
        previousStatus: "SENT",
        newStatus: "ACKNOWLEDGED",
      },
    }),
  ]);

  return true;
}

function mapInvoiceDetail(
  invoice: Prisma.InvoiceGetPayload<{
    include: {
      opco: { select: { name: true } };
      partner: { select: { name: true } };
      invoiceType: { select: { code: true } };
      invoiceStatus: { select: { code: true } };
      paymentStatus: { select: { code: true } };
      currency: { select: { isoCode: true } };
      file: { select: { id: true; filename: true; sizeBytes: true } };
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
  bankDetails: InvoiceBankDetails | null = null,
): InvoiceDetail {
  const isDigital = invoice.invoiceType.code === "CLIENT_TO_OPCO";
  const hasFile = Boolean(invoice.file);
  const paymentCode = invoice.paymentStatus?.code ?? null;
  const signatories = isDigital
    ? parseInvoiceSignatoriesJson(invoice.bankDetailsJson)
    : { preparedBy: null, approvedBy: null };

  return {
    id: invoice.id.toString(),
    invoiceNumber: invoice.invoiceNumber,
    period: periodFromParts(invoice.month, invoice.year),
    opcoName: invoice.opco?.name ?? "—",
    partnerName: invoice.partner?.name ?? null,
    direction: directionLabel(invoice.invoiceType.code),
    invoiceTypeCode: invoice.invoiceType.code,
    invoiceStatus: formatStatusLabel(
      effectiveInvoiceStatusCode(invoice.invoiceStatus.code, paymentCode),
    ),
    paymentStatus: paymentCode?.replaceAll("_", " ") ?? "—",
    uploadedAt: invoice.createdAt.toISOString(),
    acknowledgedAt: invoice.acknowledgedAt?.toISOString() ?? null,
    paidAt: invoice.paidAt?.toISOString() ?? null,
    totalAmount: invoice.items.reduce((sum, item) => sum + toNumber(item.lineTotal), 0),
    currencyCode: invoice.currency.isoCode,
    filename: invoice.file?.filename ?? null,
    fileSizeBytes: invoice.file?.sizeBytes ? Number(invoice.file.sizeBytes) : null,
    previewUrl: hasFile
      ? `/api/dizlee/invoices/${invoice.id.toString()}/preview`
      : null,
    isDigital,
    bankDetails: isDigital ? bankDetails : null,
    preparedBy: signatories.preparedBy,
    approvedBy: signatories.approvedBy,
    canMarkPayment:
      (invoice.invoiceType.code === "CLIENT_TO_OPCO" ||
        invoice.invoiceType.code === "PARTNER_TO_CLIENT") &&
      paymentCode !== "PAID",
    lineItems: invoice.items.map((item) => ({
      description: item.description,
      quantity: toNumber(item.quantity),
      unitPrice: toNumber(item.unitPrice),
      lineTotal: toNumber(item.lineTotal),
    })),
  };
}

export { PAGE_SIZE as INVOICES_PAGE_SIZE };

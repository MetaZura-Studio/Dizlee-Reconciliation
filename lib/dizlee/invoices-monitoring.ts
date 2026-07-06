import { currentPeriod, type DashboardPeriod } from "@/lib/dizlee/dashboard";
import {
  getInvoiceFilterOptions,
  type InvoiceFilterOptions,
} from "@/lib/dizlee/invoices";
import { prisma } from "@/lib/prisma";

export type InvoiceMissingSideFilter = "opco" | "partner" | "any";

export type InvoiceMonitoringFilters = {
  month: number;
  year: number;
  opcoId?: string;
  partnerId?: string;
  missing?: InvoiceMissingSideFilter;
  page: number;
};

export type InvoiceLaneStatus = "Invoiced" | "Missing";

export type InvoiceLaneSubmission = {
  status: InvoiceLaneStatus;
  invoicedAt: string | null;
  invoiceId: string | null;
};

export type InvoiceMonitoringLane = {
  laneKey: string;
  period: DashboardPeriod;
  opcoId: string;
  opcoName: string;
  partnerId: string;
  partnerName: string;
  opcoInvoice: InvoiceLaneSubmission;
  partnerInvoice: InvoiceLaneSubmission;
};

export type InvoiceMonitoringSummary = {
  linkedLanes: number;
  opcoMissing: number;
  partnerMissing: number;
  invoicesSubmitted: number;
};

export type InvoiceMonitoringResult = {
  items: InvoiceMonitoringLane[];
  summary: InvoiceMonitoringSummary;
  page: number;
  pageSize: number;
  totalPages: number;
  totalCount: number;
  filters: InvoiceMonitoringFilters;
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

function laneSubmission(
  invoice: { id: bigint; createdAt: Date } | undefined,
): InvoiceLaneSubmission {
  if (!invoice) {
    return { status: "Missing", invoicedAt: null, invoiceId: null };
  }

  return {
    status: "Invoiced",
    invoicedAt: invoice.createdAt.toISOString(),
    invoiceId: invoice.id.toString(),
  };
}

export function parseInvoiceMonitoringFilters(
  searchParams: URLSearchParams,
): InvoiceMonitoringFilters {
  const fallback = currentPeriod();
  const month = Number(searchParams.get("month"));
  const year = Number(searchParams.get("year"));
  const page = Number(searchParams.get("page"));
  const missing = searchParams.get("missing");

  return {
    month:
      Number.isInteger(month) && month >= 1 && month <= 12 ? month : fallback.month,
    year:
      Number.isInteger(year) && year >= 2000 && year <= 2100 ? year : fallback.year,
    opcoId: searchParams.get("opcoId") ?? undefined,
    partnerId: searchParams.get("partnerId") ?? undefined,
    missing:
      missing === "opco" || missing === "partner" || missing === "any"
        ? missing
        : undefined,
    page: Number.isInteger(page) && page >= 1 ? page : 1,
  };
}

export async function listInvoiceMonitoringLanes(
  filters: InvoiceMonitoringFilters,
): Promise<InvoiceMonitoringResult> {
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

  const [links, invoices] = await Promise.all([
    prisma.opcoPartnerLink.findMany({
      where: linkWhere,
      orderBy: [{ opco: { name: "asc" } }, { partner: { name: "asc" } }],
      include: {
        opco: { select: { id: true, name: true } },
        partner: { select: { id: true, name: true } },
      },
    }),
    prisma.invoice.findMany({
      where: {
        month: filters.month,
        year: filters.year,
        ...(filters.opcoId ? { opcoId: BigInt(filters.opcoId) } : {}),
        ...(filters.partnerId ? { partnerId: BigInt(filters.partnerId) } : {}),
      },
      include: {
        invoiceType: { select: { code: true } },
      },
    }),
  ]);

  const opcoInvoices = new Map<string, { id: bigint; createdAt: Date }>();
  const partnerInvoices = new Map<string, { id: bigint; createdAt: Date }>();

  for (const invoice of invoices) {
    const typeCode = invoice.invoiceType.code;
    if (typeCode === "CLIENT_TO_OPCO") {
      opcoInvoices.set(invoice.opcoId.toString(), {
        id: invoice.id,
        createdAt: invoice.createdAt,
      });
    } else if (typeCode === "PARTNER_TO_CLIENT" && invoice.partnerId) {
      const laneKey = `${invoice.opcoId.toString()}-${invoice.partnerId.toString()}`;
      partnerInvoices.set(laneKey, {
        id: invoice.id,
        createdAt: invoice.createdAt,
      });
    }
  }

  let lanes: InvoiceMonitoringLane[] = links.map((link) => {
    const laneKey = `${link.opcoId.toString()}-${link.partnerId.toString()}`;

    return {
      laneKey,
      period,
      opcoId: link.opco.id.toString(),
      opcoName: link.opco.name,
      partnerId: link.partner.id.toString(),
      partnerName: link.partner.name,
      opcoInvoice: laneSubmission(opcoInvoices.get(link.opcoId.toString())),
      partnerInvoice: laneSubmission(partnerInvoices.get(laneKey)),
    };
  });

  const summary: InvoiceMonitoringSummary = {
    linkedLanes: lanes.length,
    opcoMissing: lanes.filter((lane) => lane.opcoInvoice.status === "Missing").length,
    partnerMissing: lanes.filter((lane) => lane.partnerInvoice.status === "Missing")
      .length,
    invoicesSubmitted: invoices.length,
  };

  if (filters.missing === "opco") {
    lanes = lanes.filter((lane) => lane.opcoInvoice.status === "Missing");
  } else if (filters.missing === "partner") {
    lanes = lanes.filter((lane) => lane.partnerInvoice.status === "Missing");
  } else if (filters.missing === "any") {
    lanes = lanes.filter(
      (lane) =>
        lane.opcoInvoice.status === "Missing" ||
        lane.partnerInvoice.status === "Missing",
    );
  }

  const totalCount = lanes.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const page = Math.min(filters.page, totalPages);
  const items = lanes.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return {
    items,
    summary,
    page,
    pageSize: PAGE_SIZE,
    totalPages,
    totalCount,
    filters: { ...filters, page },
  };
}

export {
  getInvoiceFilterOptions,
  type InvoiceFilterOptions,
  PAGE_SIZE as INVOICE_MONITORING_PAGE_SIZE,
};

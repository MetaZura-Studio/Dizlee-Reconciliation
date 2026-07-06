import { currentPeriod, type DashboardPeriod } from "@/lib/dizlee/dashboard";
import {
  getInvoiceFilterOptions,
  type InvoiceFilterOptions,
} from "@/lib/dizlee/invoices";
import { prisma } from "@/lib/prisma";

export type LifecycleListFilters = {
  month: number;
  year: number;
  opcoId?: string;
  partnerId?: string;
  page: number;
};

export type LifecycleListItem = {
  id: string;
  invoiceNumber: string | null;
  period: DashboardPeriod;
  opcoName: string;
  partnerName: string | null;
  direction: string;
  invoiceStatus: string;
  paymentStatus: string;
};

export type LifecycleListResult = {
  items: LifecycleListItem[];
  page: number;
  pageSize: number;
  totalPages: number;
  totalCount: number;
  filters: LifecycleListFilters;
};

export type LifecycleStep = {
  code: string;
  label: string;
  completed: boolean;
  completedAt: string | null;
};

export type LifecycleActivityEntry = {
  id: string;
  actorName: string;
  action: string;
  statusField: string | null;
  previousStatus: string | null;
  newStatus: string | null;
  createdAt: string;
};

export type InvoiceLifecycleDetail = {
  invoice: LifecycleListItem;
  steps: LifecycleStep[];
  activities: LifecycleActivityEntry[];
};

const PAGE_SIZE = 10;

const LIFECYCLE_STEPS = [
  { code: "DRAFT", label: "Draft" },
  { code: "SENT", label: "Sent" },
  { code: "ACKNOWLEDGED", label: "Acknowledged" },
  { code: "SETTLED", label: "Settled" },
] as const;

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

function statusRank(code: string): number {
  switch (code) {
    case "DRAFT":
      return 0;
    case "SENT":
      return 1;
    case "ACKNOWLEDGED":
      return 2;
    case "SETTLED":
      return 3;
    default:
      return -1;
  }
}

function buildSteps(params: {
  statusCode: string;
  sentAt: Date | null;
  acknowledgedAt: Date | null;
  settledAt: Date | null;
  createdAt: Date;
}): LifecycleStep[] {
  const currentRank = statusRank(params.statusCode);

  return LIFECYCLE_STEPS.map((step) => {
    const stepRank = statusRank(step.code);
    const completed = currentRank >= stepRank && stepRank >= 0;

    let completedAt: string | null = null;
    if (completed) {
      switch (step.code) {
        case "DRAFT":
          completedAt = params.createdAt.toISOString();
          break;
        case "SENT":
          completedAt = params.sentAt?.toISOString() ?? null;
          break;
        case "ACKNOWLEDGED":
          completedAt = params.acknowledgedAt?.toISOString() ?? null;
          break;
        case "SETTLED":
          completedAt = params.settledAt?.toISOString() ?? null;
          break;
        default:
          break;
      }
    }

    return {
      code: step.code,
      label: step.label,
      completed,
      completedAt,
    };
  });
}

export function parseLifecycleListFilters(
  searchParams: URLSearchParams,
): LifecycleListFilters {
  const fallback = currentPeriod();
  const month = Number(searchParams.get("month"));
  const year = Number(searchParams.get("year"));
  const page = Number(searchParams.get("page"));

  return {
    month:
      Number.isInteger(month) && month >= 1 && month <= 12 ? month : fallback.month,
    year:
      Number.isInteger(year) && year >= 2000 && year <= 2100 ? year : fallback.year,
    opcoId: searchParams.get("opcoId") ?? undefined,
    partnerId: searchParams.get("partnerId") ?? undefined,
    page: Number.isInteger(page) && page >= 1 ? page : 1,
  };
}

export async function listLifecycleInvoices(
  filters: LifecycleListFilters,
): Promise<LifecycleListResult> {
  const where: {
    month: number;
    year: number;
    opcoId?: bigint;
    partnerId?: bigint;
  } = {
    month: filters.month,
    year: filters.year,
  };

  if (filters.opcoId) {
    where.opcoId = BigInt(filters.opcoId);
  }
  if (filters.partnerId) {
    where.partnerId = BigInt(filters.partnerId);
  }

  const [totalCount, rows] = await Promise.all([
    prisma.invoice.count({ where }),
    prisma.invoice.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      skip: (filters.page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        opco: { select: { name: true } },
        partner: { select: { name: true } },
        invoiceType: { select: { code: true } },
        invoiceStatus: { select: { code: true } },
        paymentStatus: { select: { code: true } },
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
    })),
    page: filters.page,
    pageSize: PAGE_SIZE,
    totalPages,
    totalCount,
    filters,
  };
}

export async function getInvoiceLifecycleDetail(
  id: string,
): Promise<InvoiceLifecycleDetail | null> {
  const invoice = await prisma.invoice.findFirst({
    where: { id: BigInt(id) },
    include: {
      opco: { select: { name: true } },
      partner: { select: { name: true } },
      invoiceType: { select: { code: true } },
      invoiceStatus: { select: { code: true } },
      paymentStatus: { select: { code: true } },
      activityLogs: {
        orderBy: { createdAt: "desc" },
        include: {
          actor: { select: { name: true, email: true } },
          action: { select: { code: true } },
        },
      },
    },
  });

  if (!invoice) {
    return null;
  }

  const listItem: LifecycleListItem = {
    id: invoice.id.toString(),
    invoiceNumber: invoice.invoiceNumber,
    period: periodFromParts(invoice.month, invoice.year),
    opcoName: invoice.opco.name,
    partnerName: invoice.partner?.name ?? null,
    direction: directionLabel(invoice.invoiceType.code),
    invoiceStatus: invoice.invoiceStatus.code.replaceAll("_", " "),
    paymentStatus: invoice.paymentStatus?.code.replaceAll("_", " ") ?? "—",
  };

  return {
    invoice: listItem,
    steps: buildSteps({
      statusCode: invoice.invoiceStatus.code,
      sentAt: invoice.sentAt,
      acknowledgedAt: invoice.acknowledgedAt,
      settledAt: invoice.settledAt,
      createdAt: invoice.createdAt,
    }),
    activities: invoice.activityLogs.map((entry) => ({
      id: entry.id.toString(),
      actorName: entry.actor.name ?? entry.actor.email,
      action: entry.action.code.replaceAll("_", " "),
      statusField: entry.statusField,
      previousStatus: entry.previousStatus,
      newStatus: entry.newStatus,
      createdAt: entry.createdAt.toISOString(),
    })),
  };
}

export {
  getInvoiceFilterOptions,
  type InvoiceFilterOptions,
  PAGE_SIZE as LIFECYCLE_PAGE_SIZE,
};

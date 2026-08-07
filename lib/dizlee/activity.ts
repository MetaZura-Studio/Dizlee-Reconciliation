/**
 * Dizlee activity timeline: lane-scoped event feed built from reports, invoices, and notifications.
 * Consumed by the activity page server component and related API routes.
 * Lanes are active OpCo–partner links; events are ordered newest-first within filters.
 */

import "server-only";

import { currentPeriod, type DashboardPeriod } from "@/lib/dizlee/dashboard";
import type {
  ActivityEvent,
  ActivityEventType,
  ActivityFilters,
  ActivityLane,
  ActivityTimelineResult,
} from "@/lib/dizlee/activity.shared";
import { getLookupId } from "@/lib/dizlee/lookups";
import { ACTIVE_OPCO_PARTNER_LINK_FILTER } from "@/lib/platform/opco-partner-links";
import {
  OPCO_REPORT_VERSION,
  PARTNER_REPORT_VERSION,
} from "@/lib/platform/reports/sides";
import { periodLabel } from "@/lib/platform/template-placeholders";
import { prisma } from "@/lib/prisma";

export type {
  ActivityEvent,
  ActivityEventType,
  ActivityFilters,
  ActivityLane,
  ActivityTimelineResult,
} from "@/lib/dizlee/activity.shared";

export class ActivityError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "ActivityError";
    this.status = status;
  }
}

function periodFromParts(month: number, year: number): DashboardPeriod {
  return {
    month,
    year,
    label: periodLabel(month, year),
  };
}

function toNumber(value: { toString(): string } | number | null | undefined): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  const n = typeof value === "number" ? value : Number(value.toString());
  return Number.isFinite(n) ? n : null;
}

function formatStatus(code: string): string {
  return code.replaceAll("_", " ");
}

function mentionsPeriod(
  subject: string,
  body: string,
  label: string,
): boolean {
  return subject.includes(label) || body.includes(label);
}

export function parseActivityFilters(
  searchParams: URLSearchParams,
): ActivityFilters {
  const fallback = currentPeriod();
  const month = Number(searchParams.get("month"));
  const year = Number(searchParams.get("year"));
  const opcoId = searchParams.get("opcoId")?.trim() || undefined;
  const partnerId = searchParams.get("partnerId")?.trim() || undefined;

  return {
    month:
      Number.isInteger(month) && month >= 1 && month <= 12 ? month : fallback.month,
    year:
      Number.isInteger(year) && year >= 2000 && year <= 2100 ? year : fallback.year,
    opcoId,
    partnerId,
  };
}

async function resolveScope(filters: ActivityFilters): Promise<{
  opcoId?: string;
  opcoName?: string;
  partnerId?: string;
  partnerName?: string;
}> {
  const [opco, partner] = await Promise.all([
    filters.opcoId
      ? prisma.opco.findFirst({
          where: { id: BigInt(filters.opcoId) },
          select: { id: true, name: true },
        })
      : Promise.resolve(null),
    filters.partnerId
      ? prisma.partner.findFirst({
          where: { id: BigInt(filters.partnerId) },
          select: { id: true, name: true },
        })
      : Promise.resolve(null),
  ]);

  if (filters.opcoId && !opco) {
    throw new ActivityError("Selected OpCo was not found.", 404);
  }
  if (filters.partnerId && !partner) {
    throw new ActivityError("Selected Partner was not found.", 404);
  }

  return {
    opcoId: opco?.id.toString(),
    opcoName: opco?.name,
    partnerId: partner?.id.toString(),
    partnerName: partner?.name,
  };
}

async function loadLanes(filters: ActivityFilters): Promise<ActivityLane[]> {
  const linkWhere: { opcoId?: bigint; partnerId?: bigint } = {};
  if (filters.opcoId) {
    linkWhere.opcoId = BigInt(filters.opcoId);
  }
  if (filters.partnerId) {
    linkWhere.partnerId = BigInt(filters.partnerId);
  }

  const links = await prisma.opcoPartnerLink.findMany({
    where: { ...linkWhere, ...ACTIVE_OPCO_PARTNER_LINK_FILTER },
    orderBy: [{ opco: { name: "asc" } }, { partner: { name: "asc" } }],
    include: {
      opco: { select: { id: true, name: true } },
      partner: { select: { id: true, name: true } },
    },
  });

  return links.map((link) => ({
    opcoId: link.opco.id.toString(),
    opcoName: link.opco.name,
    partnerId: link.partner.id.toString(),
    partnerName: link.partner.name,
  }));
}

async function loadNotificationEvents(
  filters: ActivityFilters,
  scope: { opcoId?: string; opcoName?: string; partnerId?: string; partnerName?: string },
): Promise<ActivityEvent[]> {
  const label = periodLabel(filters.month, filters.year);
  const [opcoRecipientTypeId, partnerRecipientTypeId] = await Promise.all([
    getLookupId("RECIPIENT_TYPE", "OPCO"),
    getLookupId("RECIPIENT_TYPE", "PARTNER"),
  ]);

  const recipientOr: Array<{
    recipientTypeId: number;
    recipientId: bigint | { in: bigint[] };
  }> = [];

  if (filters.opcoId) {
    recipientOr.push({
      recipientTypeId: opcoRecipientTypeId,
      recipientId: BigInt(filters.opcoId),
    });
  }
  if (filters.partnerId) {
    recipientOr.push({
      recipientTypeId: partnerRecipientTypeId,
      recipientId: BigInt(filters.partnerId),
    });
  }

  if (recipientOr.length === 0) {
    return [];
  }

  const recipients = await prisma.notificationRecipient.findMany({
    where: {
      isDeleted: false,
      OR: recipientOr,
      notification: {
        isDeleted: false,
        sentAt: { not: null },
        OR: [
          { subject: { contains: label } },
          { body: { contains: label } },
          { priority: "REMINDER" },
        ],
      },
    },
    orderBy: { notification: { sentAt: "asc" } },
    take: 200,
    include: {
      recipientType: { select: { code: true } },
      notification: {
        select: {
          id: true,
          subject: true,
          body: true,
          priority: true,
          sentAt: true,
        },
      },
    },
  });

  const events: ActivityEvent[] = [];
  const seen = new Set<string>();

  for (const row of recipients) {
    const notification = row.notification;
    if (!notification.sentAt) {
      continue;
    }

    const isReminder =
      (notification.priority?.trim().toUpperCase() ?? "") === "REMINDER";
    const inPeriod = mentionsPeriod(
      notification.subject,
      notification.body,
      label,
    );

    // Reminders may omit period in text; still include if recipient matches scope.
    // Prefer period match when present; for non-reminders require period label.
    if (!isReminder && !inPeriod) {
      continue;
    }
    if (isReminder && !inPeriod) {
      // Keep REMINDER without period only when period text is missing but
      // we still want reminders that mention the period — skip loose matches.
      continue;
    }

    const side =
      row.recipientType.code === "PARTNER" ? ("partner" as const) : ("opco" as const);
    const recipientName =
      side === "opco"
        ? (scope.opcoName ?? "OpCo")
        : (scope.partnerName ?? "Partner");

    const type: ActivityEventType = isReminder
      ? "REPORT_REMINDER_SENT"
      : "INTIMATION_SENT";
    const eventId = `${type}-${notification.id.toString()}-${row.id.toString()}`;
    if (seen.has(eventId)) {
      continue;
    }
    seen.add(eventId);

    events.push({
      id: eventId,
      type,
      occurredAt: notification.sentAt.toISOString(),
      title: isReminder ? "Reminder sent" : "Intimation sent",
      summary: `${notification.subject} → ${recipientName}`,
      meta: {
        recipientSide: side,
        recipientName,
        subject: notification.subject,
        priority: notification.priority,
      },
    });
  }

  return events;
}

async function loadReportEvents(
  filters: ActivityFilters,
  lanes: ActivityLane[],
): Promise<ActivityEvent[]> {
  if (lanes.length === 0 && !filters.opcoId && !filters.partnerId) {
    return [];
  }

  const where: {
    month: number;
    year: number;
    opcoId?: bigint | { in: bigint[] };
    partnerId?: bigint | { in: bigint[] };
    isDeleted?: boolean;
  } = {
    month: filters.month,
    year: filters.year,
    isDeleted: false,
  };

  if (filters.opcoId && filters.partnerId) {
    where.opcoId = BigInt(filters.opcoId);
    where.partnerId = BigInt(filters.partnerId);
  } else if (filters.opcoId) {
    where.opcoId = BigInt(filters.opcoId);
  } else if (filters.partnerId) {
    where.partnerId = BigInt(filters.partnerId);
  }

  const reports = await prisma.report.findMany({
    where,
    orderBy: { createdAt: "asc" },
    include: {
      opco: { select: { id: true, name: true } },
      partner: { select: { id: true, name: true } },
      status: { select: { code: true } },
      file: { select: { filename: true } },
      uploadedByUser: { select: { role: { select: { code: true } } } },
    },
  });

  return reports.map((report) => {
    const role = report.uploadedByUser?.role?.code;
    const side =
      role === "PARTNER" || report.version === PARTNER_REPORT_VERSION
        ? "Partner"
        : role === "OPCO" || report.version === OPCO_REPORT_VERSION
          ? "OpCo"
          : "Unknown";

    const lane: ActivityLane = {
      opcoId: report.opco.id.toString(),
      opcoName: report.opco.name,
      partnerId: report.partner.id.toString(),
      partnerName: report.partner.name,
    };

    return {
      id: `REPORT_RECEIVED-${report.id.toString()}`,
      type: "REPORT_RECEIVED" as const,
      occurredAt: report.createdAt.toISOString(),
      title: `${side} report received`,
      summary: `${lane.opcoName} / ${lane.partnerName} · ${report.file?.filename ?? "No file"} · ${formatStatus(report.status.code)}`,
      lane,
      href: `/dizlee/reports?month=${filters.month}&year=${filters.year}&opcoId=${lane.opcoId}&partnerId=${lane.partnerId}`,
      meta: {
        side,
        status: formatStatus(report.status.code),
        filename: report.file?.filename ?? null,
        reportId: report.id.toString(),
      },
    };
  });
}

async function loadReuploadEvents(
  filters: ActivityFilters,
): Promise<ActivityEvent[]> {
  const reportWhere: {
    month: number;
    year: number;
    opcoId?: bigint;
    partnerId?: bigint;
    isDeleted?: boolean;
  } = {
    month: filters.month,
    year: filters.year,
    isDeleted: false,
  };
  if (filters.opcoId) {
    reportWhere.opcoId = BigInt(filters.opcoId);
  }
  if (filters.partnerId) {
    reportWhere.partnerId = BigInt(filters.partnerId);
  }

  const requests = await prisma.reportChangeRequest.findMany({
    where: { report: reportWhere },
    orderBy: { createdAt: "asc" },
    include: {
      status: { select: { code: true } },
      report: {
        include: {
          opco: { select: { id: true, name: true } },
          partner: { select: { id: true, name: true } },
        },
      },
    },
  });

  const events: ActivityEvent[] = [];

  for (const request of requests) {
    const lane: ActivityLane = {
      opcoId: request.report.opco.id.toString(),
      opcoName: request.report.opco.name,
      partnerId: request.report.partner.id.toString(),
      partnerName: request.report.partner.name,
    };

    events.push({
      id: `REUPLOAD_REQUESTED-${request.id.toString()}`,
      type: "REUPLOAD_REQUESTED",
      occurredAt: request.createdAt.toISOString(),
      title: "Reupload requested",
      summary: `${lane.opcoName} / ${lane.partnerName}${request.reason ? ` · ${request.reason}` : ""}`,
      lane,
      href: `/dizlee/reports/reupload`,
      meta: {
        reason: request.reason,
        status: formatStatus(request.status.code),
      },
    });

    if (request.decidedAt) {
      const decidedLabel = formatStatus(request.status.code);
      events.push({
        id: `REUPLOAD_DECIDED-${request.id.toString()}`,
        type: "REUPLOAD_DECIDED",
        occurredAt: request.decidedAt.toISOString(),
        title: "Reupload decision",
        summary: `${lane.opcoName} / ${lane.partnerName} · ${decidedLabel}${request.decisionNote ? ` · ${request.decisionNote}` : ""}`,
        lane,
        href: `/dizlee/reports/reupload`,
        meta: {
          status: decidedLabel,
          decisionNote: request.decisionNote,
        },
      });
    }
  }

  return events;
}

async function loadReconciliationEvents(
  filters: ActivityFilters,
): Promise<ActivityEvent[]> {
  const where: {
    month: number;
    year: number;
    opcoId?: bigint;
    partnerId?: bigint;
    isDeleted?: boolean;
  } = {
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

  const rows = await prisma.reconciliation.findMany({
    where,
    orderBy: { runAt: "asc" },
    include: {
      opco: { select: { id: true, name: true } },
      partner: { select: { id: true, name: true } },
      status: { select: { code: true } },
    },
  });

  return rows.map((row) => {
    const lane: ActivityLane = {
      opcoId: row.opco.id.toString(),
      opcoName: row.opco.name,
      partnerId: row.partner.id.toString(),
      partnerName: row.partner.name,
    };
    const outcome = formatStatus(row.status.code);
    const matched = row.matchedCount ?? 0;
    const unmatched = row.unmatchedCount ?? 0;

    return {
      id: `RECONCILIATION_RUN-${row.id}`,
      type: "RECONCILIATION_RUN" as const,
      occurredAt: row.runAt.toISOString(),
      title: "Reconciliation run",
      summary: `${lane.opcoName} / ${lane.partnerName} · ${outcome} · matched ${matched}, unmatched ${unmatched}`,
      lane,
      href: `/dizlee/reconciliation/${row.id}`,
      meta: {
        status: outcome,
        matchedCount: matched,
        unmatchedCount: unmatched,
        totalVariance: toNumber(row.totalVariance),
      },
    };
  });
}

async function loadConsolidationEvents(
  filters: ActivityFilters,
): Promise<ActivityEvent[]> {
  if (filters.opcoId) {
    const rows = await prisma.consolidation.findMany({
      where: {
        month: filters.month,
        year: filters.year,
        opcoId: BigInt(filters.opcoId),
        isDeleted: false,
        ...(filters.partnerId
          ? {
              items: {
                some: {
                  isDeleted: false,
                  partnerId: BigInt(filters.partnerId),
                },
              },
            }
          : {}),
      },
      orderBy: { generatedAt: "asc" },
      include: {
        opco: { select: { id: true, name: true } },
        status: { select: { code: true } },
        items: {
          where: {
            isDeleted: false,
            ...(filters.partnerId
              ? { partnerId: BigInt(filters.partnerId) }
              : {}),
          },
          select: {
            partnerId: true,
            partnerName: true,
            usageUsd: true,
          },
        },
      },
    });

    return rows.map((row) => {
      const totalUsd = toNumber(row.totalAmountUsd);
      const partnerNote =
        filters.partnerId && row.items[0]
          ? ` · includes ${row.items[0].partnerName}`
          : "";

      return {
        id: `CONSOLIDATION_GENERATED-${row.id}`,
        type: "CONSOLIDATION_GENERATED" as const,
        occurredAt: row.generatedAt.toISOString(),
        title: "Consolidation generated",
        summary: `${row.opco.name} · ${formatStatus(row.status.code)}${totalUsd !== null ? ` · ${totalUsd.toFixed(2)} USD` : ""}${partnerNote}`,
        href: `/dizlee/consolidation/${row.id}`,
        meta: {
          status: formatStatus(row.status.code),
          totalAmountUsd: totalUsd,
          opcoName: row.opco.name,
        },
      };
    });
  }

  // Partner-only: consolidations that include this partner
  if (filters.partnerId) {
    const rows = await prisma.consolidation.findMany({
      where: {
        month: filters.month,
        year: filters.year,
        isDeleted: false,
        items: {
          some: {
            isDeleted: false,
            partnerId: BigInt(filters.partnerId),
          },
        },
      },
      orderBy: { generatedAt: "asc" },
      include: {
        opco: { select: { id: true, name: true } },
        status: { select: { code: true } },
        items: {
          where: {
            isDeleted: false,
            partnerId: BigInt(filters.partnerId),
          },
          select: { partnerName: true, usageUsd: true },
        },
      },
    });

    return rows.map((row) => {
      const partnerUsd = row.items.reduce(
        (sum, item) => sum + (toNumber(item.usageUsd) ?? 0),
        0,
      );
      const partnerName = row.items[0]?.partnerName ?? "Partner";

      return {
        id: `CONSOLIDATION_GENERATED-${row.id}`,
        type: "CONSOLIDATION_GENERATED" as const,
        occurredAt: row.generatedAt.toISOString(),
        title: "Consolidation generated",
        summary: `${row.opco.name} includes ${partnerName} · ${formatStatus(row.status.code)} · partner ${partnerUsd.toFixed(2)} USD`,
        href: `/dizlee/consolidation/${row.id}`,
        meta: {
          status: formatStatus(row.status.code),
          opcoName: row.opco.name,
          partnerName,
          partnerAmountUsd: partnerUsd,
        },
      };
    });
  }

  return [];
}

async function loadInvoiceEvents(
  filters: ActivityFilters,
): Promise<ActivityEvent[]> {
  const where: {
    month: number;
    year: number;
    isDeleted: boolean;
    opcoId?: bigint;
    partnerId?: bigint;
    AND?: Array<{
      opcoId?: bigint;
      OR?: Array<{ partnerId: bigint } | { partnerId: null }>;
    }>;
  } = {
    month: filters.month,
    year: filters.year,
    isDeleted: false,
  };

  if (filters.opcoId && filters.partnerId) {
    // Lane scope: partner invoices for this pair + Dizlee→OpCo invoices for OpCo
    where.AND = [
      { opcoId: BigInt(filters.opcoId) },
      {
        OR: [
          { partnerId: BigInt(filters.partnerId) },
          { partnerId: null },
        ],
      },
    ];
  } else if (filters.opcoId) {
    where.opcoId = BigInt(filters.opcoId);
  } else if (filters.partnerId) {
    where.partnerId = BigInt(filters.partnerId);
  }

  const invoices = await prisma.invoice.findMany({
    where,
    orderBy: { createdAt: "asc" },
    include: {
      opco: { select: { id: true, name: true } },
      partner: { select: { id: true, name: true } },
      invoiceType: { select: { code: true } },
      invoiceStatus: { select: { code: true } },
      paymentStatus: { select: { code: true } },
    },
  });

  const events: ActivityEvent[] = [];

  for (const invoice of invoices) {
    const number = invoice.invoiceNumber ?? `Invoice #${invoice.id.toString()}`;
    const direction =
      invoice.invoiceType.code === "CLIENT_TO_OPCO"
        ? "Dizlee → OpCo"
        : invoice.invoiceType.code === "PARTNER_TO_CLIENT"
          ? "Partner → Dizlee"
          : formatStatus(invoice.invoiceType.code);
    const invoiceStatus = formatStatus(invoice.invoiceStatus.code);
    const paymentStatus = invoice.paymentStatus
      ? formatStatus(invoice.paymentStatus.code)
      : "—";
    const lane: ActivityLane | undefined =
      invoice.opco && invoice.partner
        ? {
            opcoId: invoice.opco.id.toString(),
            opcoName: invoice.opco.name,
            partnerId: invoice.partner.id.toString(),
            partnerName: invoice.partner.name,
          }
        : undefined;

    const opcoLabel = invoice.opco?.name ?? "—";
    const href = `/dizlee/invoices?month=${filters.month}&year=${filters.year}${
      invoice.opco ? `&opcoId=${invoice.opco.id.toString()}` : ""
    }${invoice.partner ? `&partnerId=${invoice.partner.id.toString()}` : ""}`;

    const sentAt = invoice.sentAt ?? invoice.createdAt;
    events.push({
      id: `INVOICE_SENT-${invoice.id.toString()}`,
      type: "INVOICE_SENT",
      occurredAt: sentAt.toISOString(),
      title: "Invoice created / sent",
      summary: `${number} · ${direction} · ${opcoLabel}${invoice.partner ? ` / ${invoice.partner.name}` : ""} · status ${invoiceStatus}`,
      lane,
      href,
      meta: {
        invoiceNumber: invoice.invoiceNumber,
        direction,
        invoiceStatus,
        paymentStatus,
        invoiceId: invoice.id.toString(),
      },
    });

    if (invoice.acknowledgedAt) {
      events.push({
        id: `INVOICE_ACKNOWLEDGED-${invoice.id.toString()}`,
        type: "INVOICE_ACKNOWLEDGED",
        occurredAt: invoice.acknowledgedAt.toISOString(),
        title: "Invoice acknowledged",
        summary: `${number} · ${direction} · ${opcoLabel}`,
        lane,
        href,
        meta: {
          invoiceNumber: invoice.invoiceNumber,
          invoiceStatus,
          paymentStatus,
        },
      });
    }

    if (invoice.paidAt) {
      events.push({
        id: `INVOICE_PAID-${invoice.id.toString()}`,
        type: "INVOICE_PAID",
        occurredAt: invoice.paidAt.toISOString(),
        title: "Invoice paid",
        summary: `${number} · ${direction} · payment ${paymentStatus}`,
        lane,
        href,
        meta: {
          invoiceNumber: invoice.invoiceNumber,
          invoiceStatus,
          paymentStatus,
        },
      });
    }
  }

  return events;
}

function sortEvents(events: ActivityEvent[]): ActivityEvent[] {
  return [...events].sort((a, b) => {
    if (a.occurredAt === b.occurredAt) {
      return a.id.localeCompare(b.id);
    }
    return a.occurredAt < b.occurredAt ? -1 : 1;
  });
}

export async function listActivityTimeline(
  filters: ActivityFilters,
): Promise<ActivityTimelineResult> {
  const period = periodFromParts(filters.month, filters.year);
  const hasEntity = Boolean(filters.opcoId || filters.partnerId);

  if (!hasEntity) {
    return {
      period,
      scope: {},
      events: [],
      filters,
      requiresEntity: true,
    };
  }

  const scope = await resolveScope(filters);
  const lanes = await loadLanes(filters);

  const [
    notifications,
    reports,
    reuploads,
    reconciliations,
    consolidations,
    invoices,
  ] = await Promise.all([
    loadNotificationEvents(filters, scope),
    loadReportEvents(filters, lanes),
    loadReuploadEvents(filters),
    loadReconciliationEvents(filters),
    loadConsolidationEvents(filters),
    loadInvoiceEvents(filters),
  ]);

  return {
    period,
    scope,
    events: sortEvents([
      ...notifications,
      ...reports,
      ...reuploads,
      ...reconciliations,
      ...consolidations,
      ...invoices,
    ]),
    filters,
    requiresEntity: false,
  };
}

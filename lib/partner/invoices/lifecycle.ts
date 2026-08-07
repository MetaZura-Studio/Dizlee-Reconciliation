/**
 * Partner invoice lifecycle timeline and activity log for detail views.
 *
 * Portal: Partner. Steps are derived from current invoice and payment status ranks;
 * activities come from `invoiceActivityLog` ordered newest first.
 */

import { formatPeriodLabel } from "@/lib/partner/period";
import prisma from "@/lib/prisma";

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

export type PartnerInvoiceLifecycleDetail = {
  invoiceId: string;
  invoiceNumber: string | null;
  periodLabel: string;
  statusLabel: string;
  paymentStatusLabel: string;
  steps: LifecycleStep[];
  activities: LifecycleActivityEntry[];
};

const LIFECYCLE_STEPS = [
  { code: "DRAFT", label: "Draft" },
  { code: "SENT", label: "Sent" },
  { code: "ACKNOWLEDGED", label: "Acknowledged" },
  { code: "PAID", label: "Paid" },
] as const;

function statusRank(code: string): number {
  switch (code) {
    case "DRAFT":
      return 0;
    case "SENT":
      return 1;
    case "ACKNOWLEDGED":
      return 2;
    case "PAID":
    case "SETTLED":
      return 3;
    default:
      return -1;
  }
}

function buildSteps(params: {
  statusCode: string;
  paymentStatusCode: string | null;
  sentAt: Date | null;
  acknowledgedAt: Date | null;
  paidAt: Date | null;
  createdAt: Date;
}): LifecycleStep[] {
  const statusRankValue = statusRank(params.statusCode);
  const currentRank = Math.max(
    statusRankValue,
    params.paymentStatusCode === "PAID" ? 3 : -1,
  );

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
        case "PAID":
          completedAt = params.paidAt?.toISOString() ?? null;
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

/** Builds lifecycle steps and activity feed for a partner-owned invoice detail page. */
export async function getPartnerInvoiceLifecycle(
  partnerId: bigint,
  invoiceId: bigint,
): Promise<PartnerInvoiceLifecycleDetail | null> {
  const invoice = await prisma.invoice.findFirst({
    where: {
      id: invoiceId,
      partnerId,
      invoiceType: { code: "PARTNER_TO_CLIENT" },
      isDeleted: false,
    },
    include: {
      invoiceStatus: { select: { code: true, label: true } },
      paymentStatus: { select: { code: true, label: true } },
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

  return {
    invoiceId: invoice.id.toString(),
    invoiceNumber: invoice.invoiceNumber,
    periodLabel: formatPeriodLabel(invoice.month, invoice.year),
    statusLabel: invoice.invoiceStatus.label,
    paymentStatusLabel: invoice.paymentStatus?.label ?? "—",
    steps: buildSteps({
      statusCode: invoice.invoiceStatus.code,
      paymentStatusCode: invoice.paymentStatus?.code ?? null,
      sentAt: invoice.sentAt,
      acknowledgedAt: invoice.acknowledgedAt,
      paidAt: invoice.paidAt ?? invoice.settledAt,
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

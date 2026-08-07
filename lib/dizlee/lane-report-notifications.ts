/**
 * Per-lane notification history and last-sent summaries for reports workflows.
 * Consumed by reconciliation compare rows and report monitoring lanes.
 * Distinguishes intimations vs reminders via notification template categories.
 */

import { getLookupId } from "@/lib/dizlee/lookups";
import { getBroadcastTemplateOptions } from "@/lib/dizlee/notifications/intimations";
import type { BroadcastTemplateOption } from "@/lib/dizlee/notifications/broadcast.shared";
import { periodLabel } from "@/lib/platform/template-placeholders";
import { prisma } from "@/lib/prisma";

export type LaneNotificationKind = "reminder" | "intimation" | "other";

export type LaneNotificationHistoryItem = {
  id: string;
  kind: LaneNotificationKind;
  subject: string;
  bodyPreview: string;
  sentAt: string;
  sentBy: string;
  recipientSide: "opco" | "partner";
  recipientName: string;
  priority: string | null;
};

export type LaneNotificationSummary = {
  lastOpcoReminderAt: string | null;
  lastPartnerReminderAt: string | null;
  lastOpcoIntimationAt: string | null;
  lastPartnerIntimationAt: string | null;
  totalCount: number;
};

export type LaneNotificationHistoryResult = {
  opcoId: string;
  partnerId: string;
  opcoName: string;
  partnerName: string;
  periodLabel: string;
  summary: LaneNotificationSummary;
  items: LaneNotificationHistoryItem[];
  templates: BroadcastTemplateOption[];
};

function classifyKind(priority: string | null): LaneNotificationKind {
  const normalized = priority?.trim().toUpperCase() ?? "";
  if (normalized === "REMINDER") {
    return "reminder";
  }
  if (normalized === "NORMAL" || normalized === "INTIMATION" || normalized === "") {
    return "intimation";
  }
  return "other";
}

function trimPreview(body: string, max = 140): string {
  const compact = body.replace(/\s+/g, " ").trim();
  if (compact.length <= max) {
    return compact;
  }
  return `${compact.slice(0, max - 1)}…`;
}

function emptySummary(): LaneNotificationSummary {
  return {
    lastOpcoReminderAt: null,
    lastPartnerReminderAt: null,
    lastOpcoIntimationAt: null,
    lastPartnerIntimationAt: null,
    totalCount: 0,
  };
}

function buildSummary(
  items: LaneNotificationHistoryItem[],
): LaneNotificationSummary {
  const summary = emptySummary();
  summary.totalCount = items.length;

  for (const item of items) {
    if (item.recipientSide === "opco" && item.kind === "reminder") {
      if (!summary.lastOpcoReminderAt || item.sentAt > summary.lastOpcoReminderAt) {
        summary.lastOpcoReminderAt = item.sentAt;
      }
    }
    if (item.recipientSide === "partner" && item.kind === "reminder") {
      if (
        !summary.lastPartnerReminderAt ||
        item.sentAt > summary.lastPartnerReminderAt
      ) {
        summary.lastPartnerReminderAt = item.sentAt;
      }
    }
    if (item.recipientSide === "opco" && item.kind === "intimation") {
      if (
        !summary.lastOpcoIntimationAt ||
        item.sentAt > summary.lastOpcoIntimationAt
      ) {
        summary.lastOpcoIntimationAt = item.sentAt;
      }
    }
    if (item.recipientSide === "partner" && item.kind === "intimation") {
      if (
        !summary.lastPartnerIntimationAt ||
        item.sentAt > summary.lastPartnerIntimationAt
      ) {
        summary.lastPartnerIntimationAt = item.sentAt;
      }
    }
  }

  return summary;
}

async function loadLaneNotifications(params: {
  opcoId: string;
  partnerId: string;
  month: number;
  year: number;
  opcoName?: string;
  partnerName?: string;
}): Promise<{
  items: LaneNotificationHistoryItem[];
  opcoName: string;
  partnerName: string;
}> {
  const [opcoRecipientTypeId, partnerRecipientTypeId, opco, partner] =
    await Promise.all([
      getLookupId("RECIPIENT_TYPE", "OPCO"),
      getLookupId("RECIPIENT_TYPE", "PARTNER"),
      params.opcoName
        ? Promise.resolve({ name: params.opcoName })
        : prisma.opco.findFirst({
            where: { id: BigInt(params.opcoId) },
            select: { name: true },
          }),
      params.partnerName
        ? Promise.resolve({ name: params.partnerName })
        : prisma.partner.findFirst({
            where: { id: BigInt(params.partnerId) },
            select: { name: true },
          }),
    ]);

  const opcoName = opco?.name ?? "OpCo";
  const partnerName = partner?.name ?? "Partner";
  const label = periodLabel(params.month, params.year);

  const recipients = await prisma.notificationRecipient.findMany({
    where: {
      isDeleted: false,
      OR: [
        {
          recipientTypeId: opcoRecipientTypeId,
          recipientId: BigInt(params.opcoId),
        },
        {
          recipientTypeId: partnerRecipientTypeId,
          recipientId: BigInt(params.partnerId),
        },
      ],
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
    orderBy: { notification: { sentAt: "desc" } },
    take: 100,
    include: {
      recipientType: { select: { code: true } },
      notification: {
        select: {
          id: true,
          subject: true,
          body: true,
          priority: true,
          sentAt: true,
          createdByUser: { select: { name: true, email: true } },
        },
      },
    },
  });

  const items: LaneNotificationHistoryItem[] = recipients.flatMap((row) => {
    if (!row.notification.sentAt) {
      return [];
    }
    const side =
      row.recipientType.code === "PARTNER" ? ("partner" as const) : ("opco" as const);
    return [
      {
        id: `${row.notification.id.toString()}-${row.id.toString()}`,
        kind: classifyKind(row.notification.priority),
        subject: row.notification.subject,
        bodyPreview: trimPreview(row.notification.body),
        sentAt: row.notification.sentAt.toISOString(),
        sentBy:
          row.notification.createdByUser?.name ??
          row.notification.createdByUser?.email ??
          "System",
        recipientSide: side,
        recipientName: side === "opco" ? opcoName : partnerName,
        priority: row.notification.priority,
      },
    ];
  });

  return { items, opcoName, partnerName };
}

export async function getLaneNotificationHistory(params: {
  opcoId: string;
  partnerId: string;
  month: number;
  year: number;
}): Promise<LaneNotificationHistoryResult> {
  const [{ items, opcoName, partnerName }, templates] = await Promise.all([
    loadLaneNotifications(params),
    getBroadcastTemplateOptions(),
  ]);

  return {
    opcoId: params.opcoId,
    partnerId: params.partnerId,
    opcoName,
    partnerName,
    periodLabel: periodLabel(params.month, params.year),
    summary: buildSummary(items),
    items,
    templates,
  };
}

export async function getLaneNotificationSummaries(params: {
  month: number;
  year: number;
  lanes: Array<{ opcoId: string; partnerId: string }>;
}): Promise<Map<string, LaneNotificationSummary>> {
  const result = new Map<string, LaneNotificationSummary>();
  if (params.lanes.length === 0) {
    return result;
  }

  const [opcoRecipientTypeId, partnerRecipientTypeId] = await Promise.all([
    getLookupId("RECIPIENT_TYPE", "OPCO"),
    getLookupId("RECIPIENT_TYPE", "PARTNER"),
  ]);

  const opcoIds = [...new Set(params.lanes.map((lane) => lane.opcoId))];
  const partnerIds = [...new Set(params.lanes.map((lane) => lane.partnerId))];
  const label = periodLabel(params.month, params.year);

  const recipients = await prisma.notificationRecipient.findMany({
    where: {
      isDeleted: false,
      OR: [
        {
          recipientTypeId: opcoRecipientTypeId,
          recipientId: { in: opcoIds.map((id) => BigInt(id)) },
        },
        {
          recipientTypeId: partnerRecipientTypeId,
          recipientId: { in: partnerIds.map((id) => BigInt(id)) },
        },
      ],
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
    include: {
      recipientType: { select: { code: true } },
      notification: {
        select: {
          priority: true,
          sentAt: true,
        },
      },
    },
  });

  const byOpco = new Map<string, LaneNotificationHistoryItem[]>();
  const byPartner = new Map<string, LaneNotificationHistoryItem[]>();

  for (const row of recipients) {
    if (!row.notification.sentAt) {
      continue;
    }
    const side =
      row.recipientType.code === "PARTNER" ? ("partner" as const) : ("opco" as const);
    const item: LaneNotificationHistoryItem = {
      id: row.notification.sentAt.toISOString(),
      kind: classifyKind(row.notification.priority),
      subject: "",
      bodyPreview: "",
      sentAt: row.notification.sentAt.toISOString(),
      sentBy: "",
      recipientSide: side,
      recipientName: "",
      priority: row.notification.priority,
    };
    const key = row.recipientId.toString();
    if (side === "opco") {
      const list = byOpco.get(key) ?? [];
      list.push(item);
      byOpco.set(key, list);
    } else {
      const list = byPartner.get(key) ?? [];
      list.push(item);
      byPartner.set(key, list);
    }
  }

  for (const lane of params.lanes) {
    const laneKey = `${lane.opcoId}-${lane.partnerId}`;
    const combined = [
      ...(byOpco.get(lane.opcoId) ?? []),
      ...(byPartner.get(lane.partnerId) ?? []),
    ];
    result.set(laneKey, buildSummary(combined));
  }

  return result;
}

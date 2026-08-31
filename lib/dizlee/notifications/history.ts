/**
 * Outbound notification history sent by Dizlee operators (audit-style sent log).
 * Consumed by notifications history UI with recipient summaries and detail views.
 */

import {
  formatRecipientSummary,
  summarizeRecipients,
  trimNotificationPreview,
} from "@/lib/dizlee/notifications/shared";
import {
  classifyOutboxKind,
  outboxKindLabel,
  parseOutboxFilters,
  type OutboxKind,
  type OutboxKindFilter,
} from "@/lib/dizlee/notifications/outbox-filters";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export type NotificationHistoryItem = {
  id: string;
  subject: string;
  bodyPreview: string;
  sentAt: string;
  sentBy: string;
  priority: string | null;
  kind: OutboxKind;
  kindLabel: string;
  recipientSummary: string;
  opcoCount: number;
  partnerCount: number;
  userCount: number;
};

export type NotificationHistoryResult = {
  items: NotificationHistoryItem[];
  page: number;
  pageSize: number;
  totalPages: number;
  totalCount: number;
  kind: OutboxKindFilter;
};

export type NotificationHistoryDetail = {
  id: string;
  subject: string;
  body: string;
  sentAt: string;
  sentBy: string;
  priority: string | null;
  kind: OutboxKind;
  kindLabel: string;
  recipientSummary: string;
  recipients: Array<{
    type: string;
    name: string;
  }>;
};

const PAGE_SIZE = 10;

const INTIMATION_PRIORITY_VALUES = [
  "NORMAL",
  "INTIMATION",
  "HIGH",
  "LOW",
  "",
] as const;

export {
  parseOutboxFilters as parseNotificationHistoryFilters,
  type OutboxKindFilter,
};

function kindWhere(kind: OutboxKindFilter): Prisma.NotificationWhereInput {
  if (kind === "reminder") {
    return { priority: "REMINDER" };
  }
  if (kind === "intimation") {
    return {
      OR: [
        { priority: null },
        { priority: { in: [...INTIMATION_PRIORITY_VALUES] } },
      ],
    };
  }
  if (kind === "other") {
    return {
      AND: [
        { NOT: { priority: null } },
        {
          priority: {
            notIn: ["REMINDER", ...INTIMATION_PRIORITY_VALUES],
          },
        },
      ],
    };
  }
  return {};
}

async function loadRecipientNameMaps(recipients: Array<{
  recipientType: { code: string };
  recipientId: bigint;
}>) {
  const opcoIds = new Set<string>();
  const partnerIds = new Set<string>();
  const userIds = new Set<string>();

  for (const recipient of recipients) {
    const id = recipient.recipientId.toString();
    if (recipient.recipientType.code === "OPCO") {
      opcoIds.add(id);
    } else if (recipient.recipientType.code === "PARTNER") {
      partnerIds.add(id);
    } else if (recipient.recipientType.code === "USER") {
      userIds.add(id);
    }
  }

  const [opcos, partners, users] = await Promise.all([
    opcoIds.size > 0
      ? prisma.opco.findMany({
          where: { id: { in: [...opcoIds].map((id) => BigInt(id)) } },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
    partnerIds.size > 0
      ? prisma.partner.findMany({
          where: { id: { in: [...partnerIds].map((id) => BigInt(id)) } },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
    userIds.size > 0
      ? prisma.user.findMany({
          where: { id: { in: [...userIds].map((id) => BigInt(id)) } },
          select: { id: true, name: true, email: true },
        })
      : Promise.resolve([]),
  ]);

  return {
    opcoNames: new Map(opcos.map((row) => [row.id.toString(), row.name])),
    partnerNames: new Map(partners.map((row) => [row.id.toString(), row.name])),
    userNames: new Map(
      users.map((row) => [
        row.id.toString(),
        row.name ?? row.email ?? "User",
      ]),
    ),
  };
}

export async function listNotificationHistory(filters: {
  page: number;
  kind?: OutboxKindFilter;
}): Promise<NotificationHistoryResult> {
  const kind = filters.kind ?? "all";
  const where: Prisma.NotificationWhereInput = {
    isDeleted: false,
    status: { code: "SENT" },
    createdByUser: {
      role: { code: "CLIENT", lookupType: { code: "USER_ROLE" } },
    },
    ...kindWhere(kind),
  };

  const [totalCount, rows] = await Promise.all([
    prisma.notification.count({ where }),
    prisma.notification.findMany({
      where,
      orderBy: { sentAt: "desc" },
      skip: (filters.page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        createdByUser: { select: { name: true, email: true } },
        recipients: {
          where: { isDeleted: false },
          include: { recipientType: { select: { code: true } } },
        },
      },
    }),
  ]);

  const allRecipients = rows.flatMap((row) => row.recipients);
  const nameMaps = await loadRecipientNameMaps(allRecipients);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const page = Math.min(filters.page, totalPages);

  const items: NotificationHistoryItem[] = [];

  for (const row of rows) {
    const summary = await summarizeRecipients(row.recipients, nameMaps);
    const itemKind = classifyOutboxKind(row.priority);
    items.push({
      id: row.id.toString(),
      subject: row.subject,
      bodyPreview: trimNotificationPreview(row.body),
      sentAt: (row.sentAt ?? row.createdAt).toISOString(),
      sentBy: row.createdByUser?.name ?? row.createdByUser?.email ?? "Dizlee",
      priority: row.priority,
      kind: itemKind,
      kindLabel: outboxKindLabel(itemKind),
      recipientSummary: formatRecipientSummary(summary),
      opcoCount: summary.opcoCount,
      partnerCount: summary.partnerCount,
      userCount: summary.userCount,
    });
  }

  return {
    items,
    page,
    pageSize: PAGE_SIZE,
    totalPages,
    totalCount,
    kind,
  };
}

export async function getNotificationHistoryDetail(
  id: string,
): Promise<NotificationHistoryDetail | null> {
  const notificationId = BigInt(id);

  const row = await prisma.notification.findFirst({
    where: {
      id: notificationId,
      isDeleted: false,
      status: { code: "SENT" },
      createdByUser: {
        role: { code: "CLIENT", lookupType: { code: "USER_ROLE" } },
      },
    },
    include: {
      createdByUser: { select: { name: true, email: true } },
      recipients: {
        where: { isDeleted: false },
        include: { recipientType: { select: { code: true } } },
      },
    },
  });

  if (!row) {
    return null;
  }

  const nameMaps = await loadRecipientNameMaps(row.recipients);
  const summary = await summarizeRecipients(row.recipients, nameMaps);
  const kind = classifyOutboxKind(row.priority);

  const recipients = row.recipients.map((recipient) => {
    const recipientId = recipient.recipientId.toString();
    const type = recipient.recipientType.code;
    let name = "Unknown";

    if (type === "OPCO") {
      name = nameMaps.opcoNames.get(recipientId) ?? "OpCo";
    } else if (type === "PARTNER") {
      name = nameMaps.partnerNames.get(recipientId) ?? "Partner";
    } else if (type === "USER") {
      name = nameMaps.userNames.get(recipientId) ?? "User";
    }

    return { type, name };
  });

  return {
    id: row.id.toString(),
    subject: row.subject,
    body: row.body,
    sentAt: (row.sentAt ?? row.createdAt).toISOString(),
    sentBy: row.createdByUser?.name ?? row.createdByUser?.email ?? "Dizlee",
    priority: row.priority,
    kind,
    kindLabel: outboxKindLabel(kind),
    recipientSummary: formatRecipientSummary(summary),
    recipients,
  };
}

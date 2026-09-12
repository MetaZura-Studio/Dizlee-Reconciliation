/**
 * Outbound notification history sent by Dizlee operators (audit-style sent log).
 * Consumed by notifications history UI with recipient summaries and detail views.
 */

import {
  summarizeOutboxEmailSend,
  type OutboxEmailAttemptHint,
  type OutboxEmailSendStatus,
  type OutboxEmailSendSummary,
} from "@/lib/auth/email-delivery.shared";
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
import { deliveryChannelLabel } from "@/lib/platform/notification-delivery.shared";
import { parseNotificationMetadata } from "@/lib/platform/notification-metadata";
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
  deliveryChannel: string;
  deliveryChannelLabel: string;
  emailSendStatus: OutboxEmailSendStatus;
  emailSendLabel: string;
  emailSendPillLabel: string;
  emailSendSummary: string | null;
  emailReason: string | null;
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
  deliveryChannel: string;
  deliveryChannelLabel: string;
  emailSendStatus: OutboxEmailSendStatus;
  emailSendLabel: string;
  emailSendPillLabel: string;
  emailSendSummary: string | null;
  emailReason: string | null;
  recipientSummary: string;
  recipients: Array<{
    type: string;
    name: string;
  }>;
  attachments: Array<{
    id: string;
    filename: string;
  }>;
  invoiceHref: string | null;
  invoiceLabel: string | null;
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

function formatEmailSendSummary(summary: OutboxEmailSendSummary): string | null {
  if (summary.status === "not_applicable") {
    return null;
  }
  if (summary.attempted === 0) {
    return null;
  }
  if (summary.status === "sent") {
    return summary.accepted === 1
      ? "Emailed 1 recipient"
      : `Emailed ${summary.accepted} recipients`;
  }
  if (summary.status === "partly_sent") {
    return `Emailed ${summary.accepted} of ${summary.accepted + summary.failed}`;
  }
  if (summary.status === "failed") {
    return summary.failed === 1
      ? "1 email failed"
      : `${summary.failed} emails failed`;
  }
  if (summary.skipped > 0) {
    return "Email was not sent";
  }
  return null;
}

async function loadEmailSendSummaries(
  rows: Array<{
    id: bigint;
    deliveryChannel: string;
    emailCorrelationId: string | null;
  }>,
): Promise<Map<string, OutboxEmailSendSummary>> {
  const result = new Map<string, OutboxEmailSendSummary>();
  if (rows.length === 0) {
    return result;
  }

  const notificationIds = rows.map((row) => row.id);
  const correlationIds = [
    ...new Set(
      rows
        .map((row) => row.emailCorrelationId?.trim())
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const deliveries = await prisma.emailDelivery.findMany({
    where: {
      OR: [
        { notificationId: { in: notificationIds } },
        ...(correlationIds.length > 0
          ? [{ correlationId: { in: correlationIds } }]
          : []),
      ],
    },
    select: {
      notificationId: true,
      correlationId: true,
      status: true,
      skipReason: true,
      errorCode: true,
      errorMessage: true,
    },
  });

  const byNotificationId = new Map<string, OutboxEmailAttemptHint[]>();
  const byCorrelationId = new Map<string, OutboxEmailAttemptHint[]>();

  for (const delivery of deliveries) {
    const hint: OutboxEmailAttemptHint = {
      status: delivery.status,
      skipReason: delivery.skipReason,
      errorCode: delivery.errorCode,
      errorMessage: delivery.errorMessage,
    };
    if (delivery.notificationId != null) {
      const key = delivery.notificationId.toString();
      const list = byNotificationId.get(key) ?? [];
      list.push(hint);
      byNotificationId.set(key, list);
    }
    if (delivery.correlationId) {
      const list = byCorrelationId.get(delivery.correlationId) ?? [];
      list.push(hint);
      byCorrelationId.set(delivery.correlationId, list);
    }
  }

  for (const row of rows) {
    const idKey = row.id.toString();
    const fromNotification = byNotificationId.get(idKey) ?? [];
    const fromCorrelation = row.emailCorrelationId
      ? (byCorrelationId.get(row.emailCorrelationId) ?? [])
      : [];
    // Prefer direct notification link; fall back to shared correlation batch.
    const attempts =
      fromNotification.length > 0 ? fromNotification : fromCorrelation;
    result.set(
      idKey,
      summarizeOutboxEmailSend({
        deliveryChannel: row.deliveryChannel,
        attempts,
      }),
    );
  }

  return result;
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
  const [nameMaps, emailSummaries] = await Promise.all([
    loadRecipientNameMaps(allRecipients),
    loadEmailSendSummaries(rows),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const page = Math.min(filters.page, totalPages);

  const items: NotificationHistoryItem[] = [];

  for (const row of rows) {
    const summary = await summarizeRecipients(row.recipients, nameMaps);
    const itemKind = classifyOutboxKind(row.priority);
    const emailSummary =
      emailSummaries.get(row.id.toString()) ??
      summarizeOutboxEmailSend({
        deliveryChannel: row.deliveryChannel,
        attempts: [],
      });
    items.push({
      id: row.id.toString(),
      subject: row.subject,
      bodyPreview: trimNotificationPreview(row.body),
      sentAt: (row.sentAt ?? row.createdAt).toISOString(),
      sentBy: row.createdByUser?.name ?? row.createdByUser?.email ?? "Dizlee",
      priority: row.priority,
      kind: itemKind,
      kindLabel: outboxKindLabel(itemKind),
      deliveryChannel: row.deliveryChannel,
      deliveryChannelLabel: deliveryChannelLabel(row.deliveryChannel),
      emailSendStatus: emailSummary.status,
      emailSendLabel: emailSummary.label,
      emailSendPillLabel: emailSummary.pillLabel,
      emailSendSummary: formatEmailSendSummary(emailSummary),
      emailReason: emailSummary.reason,
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
      attachments: {
        where: { isDeleted: false },
        include: {
          file: { select: { filename: true } },
        },
      },
    },
  });

  if (!row) {
    return null;
  }

  const [nameMaps, emailSummaries] = await Promise.all([
    loadRecipientNameMaps(row.recipients),
    loadEmailSendSummaries([row]),
  ]);
  const summary = await summarizeRecipients(row.recipients, nameMaps);
  const kind = classifyOutboxKind(row.priority);
  const emailSummary =
    emailSummaries.get(row.id.toString()) ??
    summarizeOutboxEmailSend({
      deliveryChannel: row.deliveryChannel,
      attempts: [],
    });

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

  const metadata = parseNotificationMetadata(row.metadataJson);
  const invoiceHref =
    metadata?.type === "INVOICE_SENT" && metadata.invoiceId
      ? `/dizlee/invoices?id=${encodeURIComponent(metadata.invoiceId)}`
      : null;
  const invoiceLabel =
    metadata?.type === "INVOICE_SENT"
      ? metadata.invoiceNumber
        ? `Invoice ${metadata.invoiceNumber}`
        : "Open invoice"
      : null;

  return {
    id: row.id.toString(),
    subject: row.subject,
    body: row.body,
    sentAt: (row.sentAt ?? row.createdAt).toISOString(),
    sentBy: row.createdByUser?.name ?? row.createdByUser?.email ?? "Dizlee",
    priority: row.priority,
    kind,
    kindLabel: outboxKindLabel(kind),
    deliveryChannel: row.deliveryChannel,
    deliveryChannelLabel: deliveryChannelLabel(row.deliveryChannel),
    emailSendStatus: emailSummary.status,
    emailSendLabel: emailSummary.label,
    emailSendPillLabel: emailSummary.pillLabel,
    emailSendSummary: formatEmailSendSummary(emailSummary),
    emailReason: emailSummary.reason,
    recipientSummary: formatRecipientSummary(summary),
    recipients,
    attachments: row.attachments.map((attachment) => ({
      id: attachment.id.toString(),
      filename: attachment.file.filename,
    })),
    invoiceHref,
    invoiceLabel,
  };
}

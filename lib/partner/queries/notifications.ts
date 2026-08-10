/**
 * Partner notification inbox: list, detail, read state, and dismiss.
 *
 * Portal: Partner. Visibility matches USER and PARTNER recipient rows for the signed-in
 * user and tenant. Dismiss soft-deletes the recipient link, not the notification row.
 */

import type { Prisma } from "@prisma/client";

import { trimNotificationPreview } from "@/lib/partner/notifications/shared";
import prisma from "@/lib/prisma";
import { DomainError } from "@/lib/errors/app-error";

/** HTTP-friendly error for inbox mutations; `status` is intended for route handlers. */
export class PartnerNotificationError extends DomainError {
  constructor(keyOrMessage: string, status?: number) {
    super("PartnerNotificationError", keyOrMessage, status);
  }
}

export type PartnerInboxListItem = {
  id: string;
  subject: string;
  bodyPreview: string;
  receivedAt: string;
  fromName: string;
  priority: string | null;
  isRead: boolean;
};

export type PartnerInboxListResult = {
  items: PartnerInboxListItem[];
  page: number;
  pageSize: number;
  totalPages: number;
  totalCount: number;
  unreadCount: number;
  filters: PartnerInboxFilters;
};

export type PartnerInboxAttachment = {
  id: string;
  filename: string;
};

export type PartnerInboxDetail = {
  id: string;
  subject: string;
  body: string;
  receivedAt: string;
  fromName: string;
  priority: string | null;
  isRead: boolean;
  readAt: string | null;
  attachments: PartnerInboxAttachment[];
};

export type PartnerInboxFilters = {
  page: number;
  unreadOnly: boolean;
};

export const PARTNER_INBOX_PAGE_SIZE = 10;

function recipientMatch(
  userId: bigint,
  partnerId: bigint,
): Prisma.NotificationRecipientWhereInput {
  return {
    isDeleted: false,
    OR: [
      { recipientType: { code: "USER" }, recipientId: userId },
      { recipientType: { code: "PARTNER" }, recipientId: partnerId },
    ],
  };
}

function inboxWhere(
  userId: bigint,
  partnerId: bigint,
  unreadOnly: boolean,
): Prisma.NotificationWhereInput {
  return {
    isDeleted: false,
    recipients: {
      some: recipientMatch(userId, partnerId),
    },
    ...(unreadOnly
      ? {
          reads: {
            none: { userId },
          },
        }
      : {}),
  };
}

export function parsePartnerInboxFilters(
  searchParams: URLSearchParams,
): PartnerInboxFilters {
  const page = Number(searchParams.get("page"));

  return {
    page: Number.isInteger(page) && page >= 1 ? page : 1,
    unreadOnly: searchParams.get("unreadOnly") === "true",
  };
}

export async function getPartnerUnreadInboxCount(
  userId: bigint,
  partnerId: bigint,
): Promise<number> {
  return prisma.notification.count({
    where: inboxWhere(userId, partnerId, true),
  });
}

export async function listPartnerInboxNotifications(params: {
  userId: bigint;
  partnerId: bigint;
  filters: PartnerInboxFilters;
}): Promise<PartnerInboxListResult> {
  const where = inboxWhere(params.userId, params.partnerId, params.filters.unreadOnly);

  const [totalCount, unreadCount, rows] = await Promise.all([
    prisma.notification.count({ where }),
    getPartnerUnreadInboxCount(params.userId, params.partnerId),
    prisma.notification.findMany({
      where,
      orderBy: { sentAt: "desc" },
      skip: (params.filters.page - 1) * PARTNER_INBOX_PAGE_SIZE,
      take: PARTNER_INBOX_PAGE_SIZE,
      include: {
        reads: {
          where: { userId: params.userId },
          select: { readAt: true },
        },
        recipients: {
          where: recipientMatch(params.userId, params.partnerId),
          include: {
            fromUser: { select: { name: true, email: true } },
          },
          take: 1,
        },
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PARTNER_INBOX_PAGE_SIZE));
  const page = Math.min(params.filters.page, totalPages);

  return {
    items: rows.map((row) => {
      const fromUser = row.recipients[0]?.fromUser;

      return {
        id: row.id.toString(),
        subject: row.subject,
        bodyPreview: trimNotificationPreview(row.body),
        receivedAt: (row.sentAt ?? row.createdAt).toISOString(),
        fromName: fromUser?.name ?? fromUser?.email ?? "System",
        priority: row.priority,
        isRead: row.reads.length > 0,
      };
    }),
    page,
    pageSize: PARTNER_INBOX_PAGE_SIZE,
    totalPages,
    totalCount,
    unreadCount,
    filters: { ...params.filters, page },
  };
}

export async function getPartnerInboxNotificationDetail(params: {
  userId: bigint;
  partnerId: bigint;
  notificationId: bigint;
}): Promise<PartnerInboxDetail | null> {
  const row = await prisma.notification.findFirst({
    where: {
      id: params.notificationId,
      isDeleted: false,
      recipients: {
        some: recipientMatch(params.userId, params.partnerId),
      },
    },
    include: {
      reads: {
        where: { userId: params.userId },
        select: { readAt: true },
      },
      recipients: {
        where: recipientMatch(params.userId, params.partnerId),
        include: {
          fromUser: { select: { name: true, email: true } },
        },
        take: 1,
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

  const fromUser = row.recipients[0]?.fromUser;
  const read = row.reads[0];

  return {
    id: row.id.toString(),
    subject: row.subject,
    body: row.body,
    receivedAt: (row.sentAt ?? row.createdAt).toISOString(),
    fromName: fromUser?.name ?? fromUser?.email ?? "System",
    priority: row.priority,
    isRead: Boolean(read),
    readAt: read?.readAt.toISOString() ?? null,
    attachments: row.attachments.map((attachment) => ({
      id: attachment.id.toString(),
      filename: attachment.file.filename,
    })),
  };
}

export async function markPartnerInboxNotificationRead(params: {
  userId: bigint;
  partnerId: bigint;
  notificationId: bigint;
}): Promise<void> {
  const row = await prisma.notification.findFirst({
    where: {
      id: params.notificationId,
      isDeleted: false,
      recipients: {
        some: recipientMatch(params.userId, params.partnerId),
      },
    },
    select: { id: true },
  });

  if (!row) {
    throw new PartnerNotificationError("Notification not found in your inbox.", 404);
  }

  await prisma.notificationRead.upsert({
    where: {
      notificationId_userId: {
        notificationId: params.notificationId,
        userId: params.userId,
      },
    },
    update: {},
    create: {
      notificationId: params.notificationId,
      userId: params.userId,
    },
  });
}

export async function markAllPartnerInboxNotificationsRead(params: {
  userId: bigint;
  partnerId: bigint;
}): Promise<{ markedCount: number }> {
  const unread = await prisma.notification.findMany({
    where: inboxWhere(params.userId, params.partnerId, true),
    select: { id: true },
  });

  if (unread.length === 0) {
    return { markedCount: 0 };
  }

  const result = await prisma.notificationRead.createMany({
    data: unread.map((row) => ({
      notificationId: row.id,
      userId: params.userId,
    })),
    skipDuplicates: true,
  });

  return { markedCount: result.count };
}

export async function dismissPartnerInboxNotification(params: {
  userId: bigint;
  partnerId: bigint;
  notificationId: bigint;
}): Promise<void> {
  const dismissed = await prisma.notificationRecipient.updateMany({
    where: {
      notificationId: params.notificationId,
      isDeleted: false,
      OR: [
        { recipientType: { code: "USER" }, recipientId: params.userId },
        { recipientType: { code: "PARTNER" }, recipientId: params.partnerId },
      ],
    },
    data: {
      isDeleted: true,
      deletedAt: new Date(),
      deletedByUserId: params.userId,
    },
  });

  if (dismissed.count === 0) {
    throw new PartnerNotificationError("Notification not found in your inbox.", 404);
  }
}

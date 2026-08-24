/**
 * Admin notification inbox: list, detail, read state, and dismiss.
 * Recipients are USER rows for the signed-in Admin (OpCo link requests, etc.).
 */

import type { Prisma } from "@prisma/client";

import { DomainError } from "@/lib/errors/app-error";
import { prisma } from "@/lib/prisma";

const BODY_PREVIEW_LENGTH = 120;

function trimNotificationPreview(body: string): string {
  const normalized = body.replace(/\s+/g, " ").trim();
  if (normalized.length <= BODY_PREVIEW_LENGTH) {
    return normalized;
  }
  return `${normalized.slice(0, BODY_PREVIEW_LENGTH - 1)}…`;
}

export class AdminNotificationError extends DomainError {
  constructor(keyOrMessage: string, status?: number) {
    super("AdminNotificationError", keyOrMessage, status);
  }
}

export type AdminInboxListItem = {
  id: string;
  subject: string;
  bodyPreview: string;
  receivedAt: string;
  fromName: string;
  isRead: boolean;
};

export type AdminInboxFilters = {
  page: number;
  unreadOnly: boolean;
};

export type AdminInboxListResult = {
  items: AdminInboxListItem[];
  page: number;
  pageSize: number;
  totalPages: number;
  totalCount: number;
  unreadCount: number;
  filters: AdminInboxFilters;
};

export type AdminInboxDetail = {
  id: string;
  subject: string;
  body: string;
  receivedAt: string;
  fromName: string;
  isRead: boolean;
  readAt: string | null;
};

export const ADMIN_INBOX_PAGE_SIZE = 10;

function recipientMatch(userId: bigint): Prisma.NotificationRecipientWhereInput {
  return {
    isDeleted: false,
    recipientType: { code: "USER" },
    recipientId: userId,
  };
}

function inboxWhere(
  userId: bigint,
  unreadOnly: boolean,
): Prisma.NotificationWhereInput {
  return {
    isDeleted: false,
    recipients: {
      some: recipientMatch(userId),
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

export function parseAdminInboxFilters(
  searchParams: URLSearchParams,
): AdminInboxFilters {
  const page = Number(searchParams.get("page"));
  return {
    page: Number.isInteger(page) && page >= 1 ? page : 1,
    unreadOnly: searchParams.get("unreadOnly") === "true",
  };
}

export async function getAdminUnreadInboxCount(userId: bigint): Promise<number> {
  return prisma.notification.count({
    where: inboxWhere(userId, true),
  });
}

export async function listAdminInboxNotifications(params: {
  userId: bigint;
  filters: AdminInboxFilters;
}): Promise<AdminInboxListResult> {
  const where = inboxWhere(params.userId, params.filters.unreadOnly);

  const [totalCount, unreadCount, rows] = await Promise.all([
    prisma.notification.count({ where }),
    getAdminUnreadInboxCount(params.userId),
    prisma.notification.findMany({
      where,
      orderBy: { sentAt: "desc" },
      skip: (params.filters.page - 1) * ADMIN_INBOX_PAGE_SIZE,
      take: ADMIN_INBOX_PAGE_SIZE,
      include: {
        reads: {
          where: { userId: params.userId },
          select: { readAt: true },
        },
        recipients: {
          where: recipientMatch(params.userId),
          include: {
            fromUser: { select: { name: true, email: true } },
          },
          take: 1,
        },
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / ADMIN_INBOX_PAGE_SIZE));
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
        isRead: row.reads.length > 0,
      };
    }),
    page,
    pageSize: ADMIN_INBOX_PAGE_SIZE,
    totalPages,
    totalCount,
    unreadCount,
    filters: { ...params.filters, page },
  };
}

export async function getAdminInboxNotificationDetail(params: {
  userId: bigint;
  notificationId: bigint;
}): Promise<AdminInboxDetail | null> {
  const row = await prisma.notification.findFirst({
    where: {
      id: params.notificationId,
      isDeleted: false,
      recipients: {
        some: recipientMatch(params.userId),
      },
    },
    include: {
      reads: {
        where: { userId: params.userId },
        select: { readAt: true },
      },
      recipients: {
        where: recipientMatch(params.userId),
        include: {
          fromUser: { select: { name: true, email: true } },
        },
        take: 1,
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
    isRead: Boolean(read),
    readAt: read?.readAt.toISOString() ?? null,
  };
}

export async function markAdminInboxNotificationRead(params: {
  userId: bigint;
  notificationId: bigint;
}): Promise<void> {
  const row = await prisma.notification.findFirst({
    where: {
      id: params.notificationId,
      isDeleted: false,
      recipients: {
        some: recipientMatch(params.userId),
      },
    },
    select: { id: true },
  });

  if (!row) {
    throw new AdminNotificationError("Notification not found in your inbox.", 404);
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

export async function markAllAdminInboxNotificationsRead(params: {
  userId: bigint;
}): Promise<{ markedCount: number }> {
  const unread = await prisma.notification.findMany({
    where: inboxWhere(params.userId, true),
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

export async function dismissAdminInboxNotification(params: {
  userId: bigint;
  notificationId: bigint;
}): Promise<void> {
  const dismissed = await prisma.notificationRecipient.updateMany({
    where: {
      notificationId: params.notificationId,
      isDeleted: false,
      recipientType: { code: "USER" },
      recipientId: params.userId,
    },
    data: {
      isDeleted: true,
      deletedAt: new Date(),
      deletedByUserId: params.userId,
    },
  });

  if (dismissed.count === 0) {
    throw new AdminNotificationError("Notification not found in your inbox.", 404);
  }
}

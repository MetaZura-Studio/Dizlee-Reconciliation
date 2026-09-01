/**
 * Dizlee operator notification inbox (messages addressed to the client portal).
 * Consumed by notifications inbox UI; supports read/unread and paginated listing.
 */

import {
  parseInboxFilters,
  type InboxReadFilter,
} from "@/lib/dizlee/notifications/inbox-filters";
import { NotificationError } from "@/lib/dizlee/notifications/shared";
import { trimNotificationPreview } from "@/lib/dizlee/notifications/shared";
import {
  notificationCategory,
  opcoNameFromMetadata,
  parseNotificationMetadata,
  resolveNotificationAction,
  type NotificationAction,
  type NotificationCategory,
  type NotificationMetadata,
} from "@/lib/platform/notification-metadata";
import { inboxDeliveryChannelFilter } from "@/lib/platform/notification-delivery.shared";
import { prisma } from "@/lib/prisma";

export { parseInboxFilters, type InboxReadFilter };

export type InboxListItem = {
  id: string;
  subject: string;
  bodyPreview: string;
  receivedAt: string;
  fromName: string;
  priority: string | null;
  isRead: boolean;
  category: NotificationCategory;
  opcoName: string | null;
  metadata: NotificationMetadata | null;
  action: NotificationAction | null;
};

export type InboxListResult = {
  items: InboxListItem[];
  page: number;
  pageSize: number;
  totalPages: number;
  totalCount: number;
  unreadCount: number;
};

export type InboxDetail = {
  id: string;
  subject: string;
  body: string;
  receivedAt: string;
  fromName: string;
  priority: string | null;
  isRead: boolean;
  readAt: string | null;
  category: NotificationCategory;
  opcoName: string | null;
  metadata: NotificationMetadata | null;
  action: NotificationAction | null;
};

const PAGE_SIZE = 10;

function inboxWhere(
  userId: bigint,
  readFilter: InboxReadFilter,
  search = "",
) {
  const searchFilter =
    search.length > 0
      ? {
          OR: [
            { subject: { contains: search } },
            { body: { contains: search } },
          ],
        }
      : {};

  const readFilterClause =
    readFilter === "unread"
      ? {
          reads: {
            none: {
              userId,
            },
          },
        }
      : readFilter === "read"
        ? {
            reads: {
              some: {
                userId,
              },
            },
          }
        : {};

  return {
    isDeleted: false,
    ...inboxDeliveryChannelFilter(),
    recipients: {
      some: {
        isDeleted: false,
        recipientType: { code: "USER" },
        recipientId: userId,
      },
    },
    ...searchFilter,
    ...readFilterClause,
  };
}

function mapInboxFields(row: {
  subject: string;
  metadataJson: string | null;
}) {
  const metadata = parseNotificationMetadata(row.metadataJson);
  return {
    metadata,
    category: notificationCategory(metadata, row.subject),
    opcoName: opcoNameFromMetadata(metadata),
    action: resolveNotificationAction(metadata, row.subject),
  };
}

export async function getUnreadInboxCount(userId: string): Promise<number> {
  const userIdBigInt = BigInt(userId);

  return prisma.notification.count({
    where: inboxWhere(userIdBigInt, "unread"),
  });
}

export async function listInboxNotifications(params: {
  userId: string;
  page: number;
  readFilter?: InboxReadFilter;
  /** @deprecated Use readFilter: "unread" */
  unreadOnly?: boolean;
  search?: string;
}): Promise<InboxListResult> {
  const userId = BigInt(params.userId);
  const search = params.search?.trim() ?? "";
  const readFilter =
    params.readFilter ??
    (params.unreadOnly ? "unread" : "all");
  const where = inboxWhere(userId, readFilter, search);

  const [totalCount, unreadCount, rows] = await Promise.all([
    prisma.notification.count({ where }),
    getUnreadInboxCount(params.userId),
    prisma.notification.findMany({
      where,
      orderBy: { sentAt: "desc" },
      skip: (params.page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        reads: {
          where: { userId },
          select: { readAt: true },
        },
        recipients: {
          where: {
            isDeleted: false,
            recipientType: { code: "USER" },
            recipientId: userId,
          },
          include: {
            fromUser: { select: { name: true, email: true } },
          },
          take: 1,
        },
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const page = Math.min(params.page, totalPages);

  return {
    items: rows.map((row) => {
      const fromUser = row.recipients[0]?.fromUser;
      const mapped = mapInboxFields(row);
      return {
        id: row.id.toString(),
        subject: row.subject,
        bodyPreview: trimNotificationPreview(row.body),
        receivedAt: (row.sentAt ?? row.createdAt).toISOString(),
        fromName: fromUser?.name ?? fromUser?.email ?? "System",
        priority: row.priority,
        isRead: row.reads.length > 0,
        ...mapped,
      };
    }),
    page,
    pageSize: PAGE_SIZE,
    totalPages,
    totalCount,
    unreadCount,
  };
}

export async function getInboxNotificationDetail(params: {
  userId: string;
  notificationId: string;
}): Promise<InboxDetail | null> {
  const userId = BigInt(params.userId);
  const notificationId = BigInt(params.notificationId);

  const row = await prisma.notification.findFirst({
    where: {
      id: notificationId,
      isDeleted: false,
      recipients: {
        some: {
          isDeleted: false,
          recipientType: { code: "USER" },
          recipientId: userId,
        },
      },
    },
    include: {
      reads: {
        where: { userId },
        select: { readAt: true },
      },
      recipients: {
        where: {
          isDeleted: false,
          recipientType: { code: "USER" },
          recipientId: userId,
        },
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
  const mapped = mapInboxFields(row);

  return {
    id: row.id.toString(),
    subject: row.subject,
    body: row.body,
    receivedAt: (row.sentAt ?? row.createdAt).toISOString(),
    fromName: fromUser?.name ?? fromUser?.email ?? "System",
    priority: row.priority,
    isRead: Boolean(read),
    readAt: read?.readAt.toISOString() ?? null,
    ...mapped,
  };
}

export async function markInboxNotificationRead(params: {
  userId: string;
  notificationId: string;
}): Promise<void> {
  const userId = BigInt(params.userId);
  const notificationId = BigInt(params.notificationId);

  const row = await prisma.notification.findFirst({
    where: {
      id: notificationId,
      isDeleted: false,
      recipients: {
        some: {
          isDeleted: false,
          recipientType: { code: "USER" },
          recipientId: userId,
        },
      },
    },
    select: { id: true },
  });

  if (!row) {
    throw new NotificationError("Notification not found in your inbox.", 404);
  }

  await prisma.notificationRead.upsert({
    where: {
      notificationId_userId: {
        notificationId,
        userId,
      },
    },
    update: {},
    create: {
      notificationId,
      userId,
    },
  });
}

export async function markAllInboxNotificationsRead(params: {
  userId: string;
}): Promise<{ markedCount: number }> {
  const userId = BigInt(params.userId);
  const unread = await prisma.notification.findMany({
    where: inboxWhere(userId, "unread"),
    select: { id: true },
  });

  if (unread.length === 0) {
    return { markedCount: 0 };
  }

  const result = await prisma.notificationRead.createMany({
    data: unread.map((row) => ({
      notificationId: row.id,
      userId,
    })),
    skipDuplicates: true,
  });

  return { markedCount: result.count };
}

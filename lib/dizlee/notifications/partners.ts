import { getLookupId } from "@/lib/dizlee/lookups";
import { NotificationError } from "@/lib/dizlee/notifications/intimations";
import { prisma } from "@/lib/prisma";

export type PartnerNotificationFormOptions = {
  partners: Array<{ id: string; name: string }>;
};

export type PartnerNotificationListItem = {
  id: string;
  subject: string;
  bodyPreview: string;
  partnerNames: string[];
  recipientCount: number;
  sentAt: string;
  sentBy: string;
  priority: string | null;
};

export type PartnerNotificationListResult = {
  items: PartnerNotificationListItem[];
  page: number;
  pageSize: number;
  totalPages: number;
  totalCount: number;
};

export type SendPartnerNotificationInput = {
  subject: string;
  body: string;
  partnerIds: string[];
  priority?: string | null;
  expiresAt?: string | null;
};

const PAGE_SIZE = 10;
const BODY_PREVIEW_LENGTH = 120;

function trimPreview(body: string): string {
  const normalized = body.replace(/\s+/g, " ").trim();
  if (normalized.length <= BODY_PREVIEW_LENGTH) {
    return normalized;
  }
  return `${normalized.slice(0, BODY_PREVIEW_LENGTH - 1)}…`;
}

export async function getPartnerNotificationFormOptions(): Promise<PartnerNotificationFormOptions> {
  const partners = await prisma.partner.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return {
    partners: partners.map((row) => ({ id: row.id.toString(), name: row.name })),
  };
}

export function parsePartnerNotificationListFilters(searchParams: URLSearchParams): {
  page: number;
} {
  const page = Number(searchParams.get("page"));
  return {
    page: Number.isInteger(page) && page >= 1 ? page : 1,
  };
}

export async function listPartnerNotifications(filters: {
  page: number;
}): Promise<PartnerNotificationListResult> {
  const partnerRecipientTypeId = await getLookupId("RECIPIENT_TYPE", "PARTNER");

  const where = {
    isDeleted: false,
    status: { code: "SENT" },
    recipients: {
      some: {
        isDeleted: false,
        recipientTypeId: partnerRecipientTypeId,
      },
    },
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
          where: {
            isDeleted: false,
            recipientTypeId: partnerRecipientTypeId,
          },
        },
      },
    }),
  ]);

  const partnerIds = [
    ...new Set(
      rows.flatMap((row) =>
        row.recipients.map((recipient) => recipient.recipientId.toString()),
      ),
    ),
  ];

  const partners =
    partnerIds.length > 0
      ? await prisma.partner.findMany({
          where: { id: { in: partnerIds.map((id) => BigInt(id)) } },
          select: { id: true, name: true },
        })
      : [];

  const partnerNameById = new Map(
    partners.map((partner) => [partner.id.toString(), partner.name]),
  );

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const page = Math.min(filters.page, totalPages);

  return {
    items: rows.map((row) => ({
      id: row.id.toString(),
      subject: row.subject,
      bodyPreview: trimPreview(row.body),
      partnerNames: row.recipients
        .map((recipient) =>
          partnerNameById.get(recipient.recipientId.toString()),
        )
        .filter((name): name is string => Boolean(name)),
      recipientCount: row.recipients.length,
      sentAt: (row.sentAt ?? row.createdAt).toISOString(),
      sentBy: row.createdByUser?.name ?? row.createdByUser?.email ?? "Dizlee",
      priority: row.priority,
    })),
    page,
    pageSize: PAGE_SIZE,
    totalPages,
    totalCount,
  };
}

export async function sendNotificationToPartners(params: {
  input: SendPartnerNotificationInput;
  fromUserId: string;
}): Promise<{ id: string; message: string; recipientCount: number }> {
  const subject = params.input.subject.trim();
  const body = params.input.body.trim();
  const partnerIds = [
    ...new Set(params.input.partnerIds.map((id) => id.trim())),
  ].filter(Boolean);

  if (!subject) {
    throw new NotificationError("Subject is required.", 400);
  }
  if (subject.length > 255) {
    throw new NotificationError("Subject must be 255 characters or fewer.", 400);
  }
  if (!body) {
    throw new NotificationError("Message body is required.", 400);
  }
  if (partnerIds.length === 0) {
    throw new NotificationError("Select at least one Partner.", 400);
  }

  const partners = await prisma.partner.findMany({
    where: { id: { in: partnerIds.map((id) => BigInt(id)) } },
    select: { id: true },
  });

  if (partners.length !== partnerIds.length) {
    throw new NotificationError(
      "One or more selected Partners were not found.",
      400,
    );
  }

  let expiresAt: Date | null = null;
  if (params.input.expiresAt) {
    const parsed = new Date(params.input.expiresAt);
    if (Number.isNaN(parsed.getTime())) {
      throw new NotificationError("Expiry date is invalid.", 400);
    }
    expiresAt = parsed;
  }

  const priority = params.input.priority?.trim() || null;
  const fromUserId = BigInt(params.fromUserId);

  const [sentStatusId, partnerRecipientTypeId] = await Promise.all([
    getLookupId("NOTIFICATION_STATUS", "SENT"),
    getLookupId("RECIPIENT_TYPE", "PARTNER"),
  ]);

  const sentAt = new Date();

  const notification = await prisma.notification.create({
    data: {
      subject,
      body,
      statusId: sentStatusId,
      priority,
      expiresAt,
      sentAt,
      createdByUserId: fromUserId,
      updatedByUserId: fromUserId,
      recipients: {
        create: partners.map((partner) => ({
          recipientTypeId: partnerRecipientTypeId,
          recipientId: partner.id,
          fromUserId,
          createdByUserId: fromUserId,
          updatedByUserId: fromUserId,
        })),
      },
    },
    select: { id: true },
  });

  return {
    id: notification.id.toString(),
    message: `Notification sent to ${partners.length} Partner${partners.length === 1 ? "" : "s"}.`,
    recipientCount: partners.length,
  };
}

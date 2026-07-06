import { getLookupId } from "@/lib/dizlee/lookups";
import { prisma } from "@/lib/prisma";

export type IntimationFormOptions = {
  opcos: Array<{ id: string; name: string }>;
};

export type IntimationListItem = {
  id: string;
  subject: string;
  bodyPreview: string;
  opcoNames: string[];
  recipientCount: number;
  sentAt: string;
  sentBy: string;
  priority: string | null;
};

export type IntimationListResult = {
  items: IntimationListItem[];
  page: number;
  pageSize: number;
  totalPages: number;
  totalCount: number;
};

export type SendIntimationInput = {
  subject: string;
  body: string;
  opcoIds: string[];
  priority?: string | null;
  expiresAt?: string | null;
};

const PAGE_SIZE = 10;
const BODY_PREVIEW_LENGTH = 120;

export class NotificationError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
  ) {
    super(message);
    this.name = "NotificationError";
  }
}

function trimPreview(body: string): string {
  const normalized = body.replace(/\s+/g, " ").trim();
  if (normalized.length <= BODY_PREVIEW_LENGTH) {
    return normalized;
  }
  return `${normalized.slice(0, BODY_PREVIEW_LENGTH - 1)}…`;
}

export async function getIntimationFormOptions(): Promise<IntimationFormOptions> {
  const opcos = await prisma.opco.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return {
    opcos: opcos.map((row) => ({ id: row.id.toString(), name: row.name })),
  };
}

export function parseIntimationListFilters(searchParams: URLSearchParams): {
  page: number;
} {
  const page = Number(searchParams.get("page"));
  return {
    page: Number.isInteger(page) && page >= 1 ? page : 1,
  };
}

export async function listIntimations(filters: {
  page: number;
}): Promise<IntimationListResult> {
  const opcoRecipientTypeId = await getLookupId("RECIPIENT_TYPE", "OPCO");

  const where = {
    isDeleted: false,
    status: { code: "SENT" },
    recipients: {
      some: {
        isDeleted: false,
        recipientTypeId: opcoRecipientTypeId,
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
            recipientTypeId: opcoRecipientTypeId,
          },
        },
      },
    }),
  ]);

  const opcoIds = [
    ...new Set(
      rows.flatMap((row) =>
        row.recipients.map((recipient) => recipient.recipientId.toString()),
      ),
    ),
  ];

  const opcos =
    opcoIds.length > 0
      ? await prisma.opco.findMany({
          where: { id: { in: opcoIds.map((id) => BigInt(id)) } },
          select: { id: true, name: true },
        })
      : [];

  const opcoNameById = new Map(
    opcos.map((opco) => [opco.id.toString(), opco.name]),
  );

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const page = Math.min(filters.page, totalPages);

  return {
    items: rows.map((row) => ({
      id: row.id.toString(),
      subject: row.subject,
      bodyPreview: trimPreview(row.body),
      opcoNames: row.recipients
        .map((recipient) => opcoNameById.get(recipient.recipientId.toString()))
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

export async function sendIntimationToOpcos(params: {
  input: SendIntimationInput;
  fromUserId: string;
}): Promise<{ id: string; message: string; recipientCount: number }> {
  const subject = params.input.subject.trim();
  const body = params.input.body.trim();
  const opcoIds = [...new Set(params.input.opcoIds.map((id) => id.trim()))].filter(
    Boolean,
  );

  if (!subject) {
    throw new NotificationError("Subject is required.", 400);
  }
  if (subject.length > 255) {
    throw new NotificationError("Subject must be 255 characters or fewer.", 400);
  }
  if (!body) {
    throw new NotificationError("Message body is required.", 400);
  }
  if (opcoIds.length === 0) {
    throw new NotificationError("Select at least one OpCo.", 400);
  }

  const opcos = await prisma.opco.findMany({
    where: { id: { in: opcoIds.map((id) => BigInt(id)) } },
    select: { id: true },
  });

  if (opcos.length !== opcoIds.length) {
    throw new NotificationError("One or more selected OpCos were not found.", 400);
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

  const [sentStatusId, opcoRecipientTypeId] = await Promise.all([
    getLookupId("NOTIFICATION_STATUS", "SENT"),
    getLookupId("RECIPIENT_TYPE", "OPCO"),
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
        create: opcos.map((opco) => ({
          recipientTypeId: opcoRecipientTypeId,
          recipientId: opco.id,
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
    message: `Notification sent to ${opcos.length} OpCo${opcos.length === 1 ? "" : "s"}.`,
    recipientCount: opcos.length,
  };
}

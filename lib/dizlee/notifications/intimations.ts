/**
 * Dizlee broadcast intimations: template resolution, validation, send, and history listing.
 * Consumed by notifications UI and lane-specific intimation actions.
 * Persists platform notifications with optional attachments and multi-audience recipients.
 */

import { getLookupId } from "@/lib/dizlee/lookups";
import {
  BROADCAST_PICKER_CATEGORIES,
  type BroadcastTemplateOption,
  type IntimationFormOptions,
  type IntimationListItem,
  type IntimationListResult,
  type SendBroadcastInput,
} from "@/lib/dizlee/notifications/broadcast.shared";
import {
  formatRecipientSummary,
  NotificationError,
  summarizeRecipients,
  trimNotificationPreview,
} from "@/lib/dizlee/notifications/shared";
import { getActiveEmailTemplate } from "@/lib/platform/email-templates";
import {
  notificationAttachmentCreateInput,
  NotificationAttachmentError,
  resolveNotificationAttachmentCreates,
} from "@/lib/platform/notification-attachments";
import {
  DEFAULT_NOTIFICATION_DELIVERY_CHANNEL,
  deliveryChannelLabel,
  deliverySendsEmail,
  formatDeliveryMessage,
  NotificationDeliveryError,
  parseDeliveryChannel,
} from "@/lib/platform/notification-delivery.shared";
import {
  maybeSendEventEmails,
  prepareEmailDelivery,
  resolveOrgUserEmails,
  sendNotificationEmails,
} from "@/lib/platform/notification-delivery";
import {
  applyTemplate,
  periodLabel,
} from "@/lib/platform/template-placeholders";
import { prisma } from "@/lib/prisma";

export {
  BROADCAST_TEMPLATE_CODES,
  type BroadcastAudience,
  type BroadcastMessageSource,
  type BroadcastTemplateCode,
  type BroadcastTemplateOption,
  type IntimationFormOptions,
  type IntimationListItem,
  type IntimationListResult,
  type SendBroadcastInput,
} from "@/lib/dizlee/notifications/broadcast.shared";

export { NotificationError } from "@/lib/dizlee/notifications/shared";

const PAGE_SIZE = 10;

async function loadRecipientNameMaps(recipients: Array<{
  recipientType: { code: string };
  recipientId: bigint;
}>) {
  const opcoIds = new Set<string>();
  const partnerIds = new Set<string>();

  for (const recipient of recipients) {
    const id = recipient.recipientId.toString();
    if (recipient.recipientType.code === "OPCO") {
      opcoIds.add(id);
    } else if (recipient.recipientType.code === "PARTNER") {
      partnerIds.add(id);
    }
  }

  const [opcos, partners] = await Promise.all([
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
  ]);

  return {
    opcoNames: new Map(
      opcos.map((row) => [row.id.toString(), row.name]),
    ),
    partnerNames: new Map(
      partners.map((row) => [row.id.toString(), row.name]),
    ),
    userNames: new Map<string, string>(),
  };
}

export async function getBroadcastTemplateOptions(): Promise<
  BroadcastTemplateOption[]
> {
  const templates = await prisma.notificationTemplate.findMany({
    where: {
      isDeleted: false,
      category: { in: [...BROADCAST_PICKER_CATEGORIES] },
    },
    orderBy: [{ category: "asc" }, { name: "asc" }],
    select: { code: true, name: true, subject: true, body: true },
  });

  return templates.map((row) => ({
    code: row.code,
    name: row.name,
    subject: row.subject,
    body: row.body,
  }));
}

export async function getIntimationFormOptions(): Promise<IntimationFormOptions> {
  const [opcos, partners, templates] = await Promise.all([
    prisma.opco.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.partner.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    getBroadcastTemplateOptions(),
  ]);

  return {
    opcos: opcos.map((row) => ({ id: row.id.toString(), name: row.name })),
    partners: partners.map((row) => ({ id: row.id.toString(), name: row.name })),
    templates,
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
  const where = {
    isDeleted: false,
    status: { code: "SENT" },
    recipients: {
      some: {
        isDeleted: false,
        recipientType: { code: { in: ["OPCO", "PARTNER"] } },
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
            recipientType: { code: { in: ["OPCO", "PARTNER"] } },
          },
          include: { recipientType: { select: { code: true } } },
        },
      },
    }),
  ]);

  const allRecipients = rows.flatMap((row) => row.recipients);
  const nameMaps = await loadRecipientNameMaps(allRecipients);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const page = Math.min(filters.page, totalPages);

  const items: IntimationListItem[] = [];

  for (const row of rows) {
    const summary = await summarizeRecipients(row.recipients, nameMaps);
    items.push({
      id: row.id.toString(),
      subject: row.subject,
      bodyPreview: trimNotificationPreview(row.body),
      recipientSummary: formatRecipientSummary(summary),
      recipientCount: row.recipients.length,
      sentAt: (row.sentAt ?? row.createdAt).toISOString(),
      sentBy: row.createdByUser?.name ?? row.createdByUser?.email ?? "Dizlee",
      priority: row.priority,
      deliveryChannel: row.deliveryChannel,
      deliveryChannelLabel: deliveryChannelLabel(row.deliveryChannel),
    });
  }

  return {
    items,
    page,
    pageSize: PAGE_SIZE,
    totalPages,
    totalCount,
  };
}

/** Resolves subject/body from custom text or an active notification template code. */
export async function resolveBroadcastMessage(
  input: SendBroadcastInput,
): Promise<{ subject: string; body: string }> {
  if (input.messageSource === "custom") {
    const subject = input.subject?.trim() ?? "";
    const body = input.body?.trim() ?? "";

    if (!subject) {
      throw new NotificationError("Subject is required.", 400);
    }
    if (subject.length > 255) {
      throw new NotificationError("Subject must be 255 characters or fewer.", 400);
    }
    if (!body) {
      throw new NotificationError("Message body is required.", 400);
    }

    return { subject, body };
  }

  const month = input.month;
  const year = input.year;

  if (
    !Number.isInteger(month) ||
    !Number.isInteger(year) ||
    (month ?? 0) < 1 ||
    (month ?? 0) > 12 ||
    (year ?? 0) < 2000
  ) {
    throw new NotificationError(
      "Month and year are required when using a template.",
      400,
    );
  }

  const template = await getActiveEmailTemplate(input.messageSource);
  if (!template) {
    throw new NotificationError("Selected template was not found.", 400);
  }

  const subjectTemplate = input.subject?.trim() || template.subject;
  const bodyTemplate = input.body?.trim() || template.body;
  const period = periodLabel(month!, year!);

  return {
    subject: applyTemplate(subjectTemplate, { period }).slice(0, 255),
    body: applyTemplate(bodyTemplate, { period }),
  };
}

export function validateBroadcastRecipients(input: SendBroadcastInput): {
  opcoIds: string[];
  partnerIds: string[];
} {
  const opcoIds = [...new Set(input.opcoIds.map((id) => id.trim()))].filter(
    Boolean,
  );
  const partnerIds = [
    ...new Set(input.partnerIds.map((id) => id.trim())),
  ].filter(Boolean);

  if (input.audience === "opco" && opcoIds.length === 0) {
    throw new NotificationError("Select at least one OpCo.", 400);
  }
  if (input.audience === "partner" && partnerIds.length === 0) {
    throw new NotificationError("Select at least one Partner.", 400);
  }
  if (
    input.audience === "both" &&
    opcoIds.length === 0 &&
    partnerIds.length === 0
  ) {
    throw new NotificationError(
      "Select at least one OpCo or Partner.",
      400,
    );
  }

  return { opcoIds, partnerIds };
}

export async function sendBroadcastNotification(params: {
  input: SendBroadcastInput;
  fromUserId: string;
}): Promise<{
  id: string;
  message: string;
  recipientCount: number;
  deliveryChannel: string;
  emailsSent: number;
}> {
  const { opcoIds, partnerIds } = validateBroadcastRecipients(params.input);
  const { subject, body } = await resolveBroadcastMessage(params.input);

  let deliveryChannel = DEFAULT_NOTIFICATION_DELIVERY_CHANNEL;
  try {
    deliveryChannel = parseDeliveryChannel(
      params.input.deliveryChannel,
      DEFAULT_NOTIFICATION_DELIVERY_CHANNEL,
    );
  } catch (error) {
    if (error instanceof NotificationDeliveryError) {
      throw new NotificationError(error.message, error.status);
    }
    throw error;
  }

  const shouldIncludeOpcos =
    params.input.audience === "opco" || params.input.audience === "both";
  const shouldIncludePartners =
    params.input.audience === "partner" || params.input.audience === "both";

  const resolvedOpcoIds = shouldIncludeOpcos ? opcoIds : [];
  const resolvedPartnerIds = shouldIncludePartners ? partnerIds : [];

  const [opcos, partners] = await Promise.all([
    resolvedOpcoIds.length > 0
      ? prisma.opco.findMany({
          where: { id: { in: resolvedOpcoIds.map((id) => BigInt(id)) } },
          select: { id: true },
        })
      : Promise.resolve([]),
    resolvedPartnerIds.length > 0
      ? prisma.partner.findMany({
          where: { id: { in: resolvedPartnerIds.map((id) => BigInt(id)) } },
          select: { id: true },
        })
      : Promise.resolve([]),
  ]);

  if (opcos.length !== resolvedOpcoIds.length) {
    throw new NotificationError("One or more selected OpCos were not found.", 400);
  }
  if (partners.length !== resolvedPartnerIds.length) {
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

  const requireEmailConfigured = params.input.requireEmailConfigured !== false;
  let emailRecipients: Awaited<ReturnType<typeof prepareEmailDelivery>> = [];
  if (requireEmailConfigured) {
    try {
      emailRecipients = await prepareEmailDelivery({
        channel: deliveryChannel,
        opcoIds: opcos.map((row) => row.id),
        partnerIds: partners.map((row) => row.id),
      });
    } catch (error) {
      if (error instanceof NotificationDeliveryError) {
        throw new NotificationError(error.message, error.status);
      }
      throw error;
    }
  } else if (deliverySendsEmail(deliveryChannel)) {
    emailRecipients = await resolveOrgUserEmails({
      opcoIds: opcos.map((row) => row.id),
      partnerIds: partners.map((row) => row.id),
    });
  }

  const [sentStatusId, opcoRecipientTypeId, partnerRecipientTypeId] =
    await Promise.all([
      getLookupId("NOTIFICATION_STATUS", "SENT"),
      getLookupId("RECIPIENT_TYPE", "OPCO"),
      getLookupId("RECIPIENT_TYPE", "PARTNER"),
    ]);

  let attachmentCreates: Awaited<
    ReturnType<typeof resolveNotificationAttachmentCreates>
  > = [];

  try {
    attachmentCreates = await resolveNotificationAttachmentCreates({
      attachmentFileIds: params.input.attachmentFileIds ?? [],
      userId: fromUserId,
    });
  } catch (error) {
    if (error instanceof NotificationAttachmentError) {
      throw new NotificationError(error.message, error.status);
    }
    throw error;
  }

  const attachments = notificationAttachmentCreateInput(
    attachmentCreates,
    fromUserId,
  );

  const sentAt = new Date();
  const recipientCreates = [
    ...opcos.map((opco) => ({
      recipientTypeId: opcoRecipientTypeId,
      recipientId: opco.id,
      fromUserId,
      createdByUserId: fromUserId,
      updatedByUserId: fromUserId,
    })),
    ...partners.map((partner) => ({
      recipientTypeId: partnerRecipientTypeId,
      recipientId: partner.id,
      fromUserId,
      createdByUserId: fromUserId,
      updatedByUserId: fromUserId,
    })),
  ];

  const notification = await prisma.notification.create({
    data: {
      subject,
      body,
      deliveryChannel,
      statusId: sentStatusId,
      priority,
      expiresAt,
      sentAt,
      createdByUserId: fromUserId,
      updatedByUserId: fromUserId,
      recipients: {
        create: recipientCreates,
      },
      ...(attachments ? { attachments } : {}),
    },
    select: { id: true },
  });

  const emailResult = requireEmailConfigured
    ? emailRecipients.length > 0
      ? await sendNotificationEmails({
          recipients: emailRecipients,
          subject,
          body,
        })
      : null
    : await maybeSendEventEmails({
        channel: deliveryChannel,
        recipients: emailRecipients,
        subject,
        body,
      });

  const recipientCount = recipientCreates.length;
  const parts: string[] = [];

  if (opcos.length > 0) {
    parts.push(`${opcos.length} OpCo${opcos.length === 1 ? "" : "s"}`);
  }
  if (partners.length > 0) {
    parts.push(`${partners.length} Partner${partners.length === 1 ? "" : "s"}`);
  }

  const baseMessage =
    deliveryChannel === "EMAIL"
      ? `Notification recorded for ${parts.join(" and ")}.`
      : `Notification sent to ${parts.join(" and ")}.`;

  return {
    id: notification.id.toString(),
    message: formatDeliveryMessage({
      channel: deliveryChannel,
      baseMessage,
      emailResult,
    }),
    recipientCount,
    deliveryChannel,
    emailsSent: emailResult?.sent ?? 0,
  };
}

/** @deprecated Use sendBroadcastNotification */
export async function sendIntimationToOpcos(params: {
  input: {
    subject: string;
    body: string;
    opcoIds: string[];
    priority?: string | null;
    expiresAt?: string | null;
  };
  fromUserId: string;
}) {
  return sendBroadcastNotification({
    input: {
      audience: "opco",
      opcoIds: params.input.opcoIds,
      partnerIds: [],
      messageSource: "custom",
      subject: params.input.subject,
      body: params.input.body,
      priority: params.input.priority,
      expiresAt: params.input.expiresAt,
    },
    fromUserId: params.fromUserId,
  });
}

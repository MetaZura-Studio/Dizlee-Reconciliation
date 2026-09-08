/**
 * In-app (+ optional email) notification delivery to all users of a single OpCo.
 * Event-driven callers default to BOTH; SMTP failures are logged, not thrown.
 */
import { randomUUID } from "crypto";

import {
  type NotificationMetadata,
  serializeNotificationMetadata,
} from "@/lib/platform/notification-metadata";
import {
  DEFAULT_NOTIFICATION_DELIVERY_CHANNEL,
  deliverySendsEmail,
  parseDeliveryChannel,
  type NotificationDeliveryChannel,
} from "@/lib/platform/notification-delivery.shared";
import {
  maybeSendEventEmails,
  resolveOrgUserEmails,
} from "@/lib/platform/notification-delivery";
import { prisma } from "@/lib/prisma";

/**
 * Creates a notification for an OpCo (visible to all users of that OpCo).
 * When channel is Email/Both, also emails active OpCo users if SMTP is ready.
 */
export async function notifyOpcoUsers(params: {
  opcoId: bigint;
  fromUserId: bigint;
  subject: string;
  body: string;
  metadata?: NotificationMetadata;
  deliveryChannel?: NotificationDeliveryChannel;
  /** File IDs to link on the in-app notification (inbox / Outbox). */
  attachmentFileIds?: Array<bigint | string>;
  /** Binary attachments for SMTP when Email/Both is selected. */
  emailAttachments?: Array<{
    filename: string;
    content: Buffer;
    contentType?: string;
  }>;
}): Promise<void> {
  const deliveryChannel = parseDeliveryChannel(
    params.deliveryChannel,
    DEFAULT_NOTIFICATION_DELIVERY_CHANNEL,
  );

  const [sentStatus, opcoRecipientType] = await Promise.all([
    prisma.lookup.findFirst({
      where: {
        code: "SENT",
        lookupType: { code: "NOTIFICATION_STATUS" },
      },
      select: { id: true },
    }),
    prisma.lookup.findFirst({
      where: {
        code: "OPCO",
        lookupType: { code: "RECIPIENT_TYPE" },
      },
      select: { id: true },
    }),
  ]);

  if (!sentStatus || !opcoRecipientType) {
    return;
  }

  const emailCorrelationId = deliverySendsEmail(deliveryChannel)
    ? randomUUID()
    : null;

  const attachmentCreates = (params.attachmentFileIds ?? [])
    .map((id) => BigInt(id))
    .filter((id) => id > BigInt(0))
    .map((fileId) => ({ fileId }));

  const notification = await prisma.notification.create({
    data: {
      subject: params.subject,
      body: params.body,
      deliveryChannel,
      emailCorrelationId,
      metadataJson: params.metadata
        ? serializeNotificationMetadata(params.metadata)
        : null,
      statusId: sentStatus.id,
      sentAt: new Date(),
      createdByUserId: params.fromUserId,
      recipients: {
        create: {
          recipientTypeId: opcoRecipientType.id,
          recipientId: params.opcoId,
          fromUserId: params.fromUserId,
        },
      },
      ...(attachmentCreates.length > 0
        ? { attachments: { create: attachmentCreates } }
        : {}),
    },
    select: { id: true },
  });

  const emailRecipients = await resolveOrgUserEmails({
    opcoIds: [params.opcoId],
    partnerIds: [],
  });
  await maybeSendEventEmails({
    channel: deliveryChannel,
    recipients: emailRecipients,
    subject: params.subject,
    body: params.body,
    purpose: "EVENT",
    notificationId: notification.id,
    actorUserId: params.fromUserId,
    correlationId: emailCorrelationId ?? undefined,
    attachments: params.emailAttachments,
  });
}

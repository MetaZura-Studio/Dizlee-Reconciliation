/**
 * In-app (+ optional email) notification delivery to all users of a single OpCo.
 * Event-driven callers default to BOTH; SMTP failures are logged, not thrown.
 */
import {
  type NotificationMetadata,
  serializeNotificationMetadata,
} from "@/lib/platform/notification-metadata";
import {
  DEFAULT_NOTIFICATION_DELIVERY_CHANNEL,
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

  await prisma.notification.create({
    data: {
      subject: params.subject,
      body: params.body,
      deliveryChannel,
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
    },
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
  });
}

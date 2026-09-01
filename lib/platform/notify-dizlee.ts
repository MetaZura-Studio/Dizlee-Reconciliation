/**
 * In-app (+ optional email) notification fan-out to portal users by USER_ROLE code.
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
  type OrgEmailRecipient,
} from "@/lib/platform/notification-delivery";
import { prisma } from "@/lib/prisma";

async function notifyUsersByRoleCodes(params: {
  fromUserId: bigint;
  subject: string;
  body: string;
  roleCodes: string[];
  metadata?: NotificationMetadata;
  deliveryChannel?: NotificationDeliveryChannel;
}): Promise<void> {
  const deliveryChannel = parseDeliveryChannel(
    params.deliveryChannel,
    DEFAULT_NOTIFICATION_DELIVERY_CHANNEL,
  );

  const [sentStatus, userRecipientType, users] = await Promise.all([
    prisma.lookup.findFirst({
      where: {
        code: "SENT",
        lookupType: { code: "NOTIFICATION_STATUS" },
      },
      select: { id: true },
    }),
    prisma.lookup.findFirst({
      where: {
        code: "USER",
        lookupType: { code: "RECIPIENT_TYPE" },
      },
      select: { id: true },
    }),
    prisma.user.findMany({
      where: {
        isDeleted: false,
        status: { code: "ACTIVE" },
        role: {
          code: { in: params.roleCodes },
          lookupType: { code: "USER_ROLE" },
        },
      },
      select: { id: true, email: true, name: true },
    }),
  ]);

  if (!sentStatus || !userRecipientType || users.length === 0) {
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
        create: users.map((user) => ({
          recipientTypeId: userRecipientType.id,
          recipientId: user.id,
          fromUserId: params.fromUserId,
        })),
      },
    },
  });

  const byEmail = new Map<string, OrgEmailRecipient>();
  for (const user of users) {
    const email = user.email.trim();
    if (!email) {
      continue;
    }
    const key = email.toLowerCase();
    if (!byEmail.has(key)) {
      byEmail.set(key, { email, name: user.name });
    }
  }

  await maybeSendEventEmails({
    channel: deliveryChannel,
    recipients: [...byEmail.values()],
    subject: params.subject,
    body: params.body,
  });
}

/**
 * Creates a notification for all Dizlee (CLIENT) portal users.
 */
export async function notifyDizleeUsers(params: {
  fromUserId: bigint;
  subject: string;
  body: string;
  metadata?: NotificationMetadata;
  deliveryChannel?: NotificationDeliveryChannel;
}): Promise<void> {
  await notifyUsersByRoleCodes({
    ...params,
    roleCodes: ["CLIENT"],
  });
}

/**
 * Creates a notification for Admin portal users only.
 */
export async function notifyAdminUsers(params: {
  fromUserId: bigint;
  subject: string;
  body: string;
  metadata?: NotificationMetadata;
  deliveryChannel?: NotificationDeliveryChannel;
}): Promise<void> {
  await notifyUsersByRoleCodes({
    ...params,
    roleCodes: ["ADMIN"],
  });
}

/**
 * Creates a notification for Admin and Dizlee (CLIENT) users.
 */
export async function notifyAdminAndDizleeUsers(params: {
  fromUserId: bigint;
  subject: string;
  body: string;
  metadata?: NotificationMetadata;
  deliveryChannel?: NotificationDeliveryChannel;
}): Promise<void> {
  await notifyUsersByRoleCodes({
    ...params,
    roleCodes: ["ADMIN", "CLIENT"],
  });
}

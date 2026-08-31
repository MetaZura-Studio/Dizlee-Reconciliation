/**
 * In-app notification fan-out to portal users by USER_ROLE code.
 */
import {
  type NotificationMetadata,
  serializeNotificationMetadata,
} from "@/lib/platform/notification-metadata";
import { prisma } from "@/lib/prisma";

async function notifyUsersByRoleCodes(params: {
  fromUserId: bigint;
  subject: string;
  body: string;
  roleCodes: string[];
  metadata?: NotificationMetadata;
}): Promise<void> {
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
        role: {
          code: { in: params.roleCodes },
          lookupType: { code: "USER_ROLE" },
        },
      },
      select: { id: true },
    }),
  ]);

  if (!sentStatus || !userRecipientType || users.length === 0) {
    return;
  }

  await prisma.notification.create({
    data: {
      subject: params.subject,
      body: params.body,
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
}

/**
 * Creates an in-app notification for all Dizlee (CLIENT) portal users.
 */
export async function notifyDizleeUsers(params: {
  fromUserId: bigint;
  subject: string;
  body: string;
  metadata?: NotificationMetadata;
}): Promise<void> {
  await notifyUsersByRoleCodes({
    ...params,
    roleCodes: ["CLIENT"],
  });
}

/**
 * Creates an in-app notification for Admin portal users only.
 */
export async function notifyAdminUsers(params: {
  fromUserId: bigint;
  subject: string;
  body: string;
  metadata?: NotificationMetadata;
}): Promise<void> {
  await notifyUsersByRoleCodes({
    ...params,
    roleCodes: ["ADMIN"],
  });
}

/**
 * Creates an in-app notification for Admin and Dizlee (CLIENT) users.
 */
export async function notifyAdminAndDizleeUsers(params: {
  fromUserId: bigint;
  subject: string;
  body: string;
  metadata?: NotificationMetadata;
}): Promise<void> {
  await notifyUsersByRoleCodes({
    ...params,
    roleCodes: ["ADMIN", "CLIENT"],
  });
}

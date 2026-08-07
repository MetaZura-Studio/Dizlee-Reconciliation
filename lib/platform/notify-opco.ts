/**
 * In-app notification delivery to all users of a single OpCo organization.
 */
import { prisma } from "@/lib/prisma";

/**
 * Creates an in-app notification for an OpCo (visible to all users of that OpCo).
 */
export async function notifyOpcoUsers(params: {
  opcoId: bigint;
  fromUserId: bigint;
  subject: string;
  body: string;
}): Promise<void> {
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
}

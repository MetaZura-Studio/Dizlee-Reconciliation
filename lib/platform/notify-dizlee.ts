import { prisma } from "@/lib/prisma";

/**
 * Creates an in-app notification for all Dizlee (CLIENT) portal users.
 */
export async function notifyDizleeUsers(params: {
  fromUserId: bigint;
  subject: string;
  body: string;
}): Promise<void> {
  const [sentStatus, userRecipientType, dizleeUsers] = await Promise.all([
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
        role: { code: "CLIENT", lookupType: { code: "USER_ROLE" } },
      },
      select: { id: true },
    }),
  ]);

  if (!sentStatus || !userRecipientType || dizleeUsers.length === 0) {
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
        create: dizleeUsers.map((user) => ({
          recipientTypeId: userRecipientType.id,
          recipientId: user.id,
          fromUserId: params.fromUserId,
        })),
      },
    },
  });
}

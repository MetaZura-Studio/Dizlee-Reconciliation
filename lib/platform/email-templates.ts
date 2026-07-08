import { prisma } from "@/lib/prisma";

export type ActiveEmailTemplate = {
  code: string;
  subject: string;
  body: string;
};

export async function getActiveEmailTemplate(
  code: string,
): Promise<ActiveEmailTemplate | null> {
  const template = await prisma.notificationTemplate.findFirst({
    where: { code, isDeleted: false },
    select: { code: true, subject: true, body: true },
  });

  if (!template) {
    return null;
  }

  return {
    code: template.code,
    subject: template.subject,
    body: template.body,
  };
}

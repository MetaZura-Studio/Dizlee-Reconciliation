/**
 * Upserts ALERT-category notification templates from seed data without a full DB seed.
 * Use after adding reconciliation alert templates to an existing environment.
 */

import { PrismaClient } from "@prisma/client";

import { NOTIFICATION_TEMPLATE_SEEDS } from "../prisma/seed-data/notification-templates";

const prisma = new PrismaClient();

async function main() {
  const active = await prisma.lookup.findFirst({
    where: { code: "ACTIVE", lookupType: { code: "USER_STATUS" } },
  });
  if (!active) {
    throw new Error("ACTIVE status missing");
  }

  for (const template of NOTIFICATION_TEMPLATE_SEEDS.filter(
    (item) => item.category === "ALERT",
  )) {
    const record = await prisma.notificationTemplate.upsert({
      where: { code: template.code },
      update: {
        name: template.name,
        category: template.category,
        subject: template.subject,
        body: template.body,
        statusId: active.id,
        isDeleted: false,
      },
      create: {
        code: template.code,
        name: template.name,
        category: template.category,
        subject: template.subject,
        body: template.body,
        statusId: active.id,
      },
    });

    for (const version of template.versions) {
      await prisma.emailTemplateVersion.upsert({
        where: {
          notificationTemplateId_version: {
            notificationTemplateId: record.id,
            version: version.version,
          },
        },
        update: {
          subject: version.subject,
          body: version.body,
          isEnabled: true,
        },
        create: {
          notificationTemplateId: record.id,
          version: version.version,
          subject: version.subject,
          body: version.body,
        },
      });
    }

    console.log("upserted", template.code);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

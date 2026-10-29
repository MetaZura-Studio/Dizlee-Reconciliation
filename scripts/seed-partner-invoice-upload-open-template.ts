/**
 * One-shot upsert for PARTNER_INVOICE_UPLOAD_OPEN (local/dev after migration).
 */
import { PrismaClient } from "@prisma/client";

import { NOTIFICATION_TEMPLATE_SEEDS } from "../prisma/seed-data/notification-templates";

async function main() {
  const prisma = new PrismaClient();
  const seed = NOTIFICATION_TEMPLATE_SEEDS.find(
    (t) => t.code === "PARTNER_INVOICE_UPLOAD_OPEN",
  );
  if (!seed) {
    throw new Error("PARTNER_INVOICE_UPLOAD_OPEN seed missing");
  }

  const activeStatus = await prisma.lookup.findFirst({
    where: { code: "ACTIVE", lookupType: { code: "USER_STATUS" } },
    select: { id: true },
  });
  if (!activeStatus) {
    throw new Error("USER_STATUS.ACTIVE lookup missing");
  }

  const record = await prisma.notificationTemplate.upsert({
    where: { code: seed.code },
    create: {
      code: seed.code,
      name: seed.name,
      category: seed.category,
      subject: seed.subject,
      body: seed.body,
      statusId: activeStatus.id,
    },
    update: {
      name: seed.name,
      category: seed.category,
      subject: seed.subject,
      body: seed.body,
      statusId: activeStatus.id,
      isDeleted: false,
    },
  });

  for (const version of seed.versions) {
    await prisma.emailTemplateVersion.upsert({
      where: {
        notificationTemplateId_version: {
          notificationTemplateId: record.id,
          version: version.version,
        },
      },
      create: {
        notificationTemplateId: record.id,
        version: version.version,
        subject: version.subject,
        body: version.body,
        changeNote: version.changeNote ?? null,
      },
      update: {
        subject: version.subject,
        body: version.body,
        changeNote: version.changeNote ?? null,
        isEnabled: true,
      },
    });
  }

  console.log("seeded", record.code, record.id.toString());
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

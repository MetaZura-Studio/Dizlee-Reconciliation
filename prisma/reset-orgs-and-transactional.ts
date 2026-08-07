/**
 * Clears transactional data and hard-deletes OpCos, Partners, links, and org users
 * so the Excel-based seed can recreate a clean roster.
 *
 * Keeps: lookups, currencies, rates, app settings, email templates.
 * Platform users (admin/client) are deleted too and recreated by seed.
 *
 * Usage: npm run db:reset-orgs
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const PLATFORM_EMAILS = ["admin@dizlee.com", "client@dizlee.com"] as const;

async function clearTransactionalData() {
  await prisma.$transaction([
    prisma.notificationRead.deleteMany(),
    prisma.notificationAttachment.deleteMany(),
    prisma.notificationRecipient.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.invoiceActivityLog.deleteMany(),
    prisma.invoiceItem.deleteMany(),
    prisma.reconciliationItem.deleteMany(),
    prisma.reconciliation.deleteMany(),
    prisma.consolidationItem.deleteMany(),
    prisma.consolidation.deleteMany(),
    prisma.reportChangeRequest.deleteMany(),
    prisma.reportLineItem.deleteMany(),
    prisma.report.deleteMany(),
    prisma.invoice.deleteMany(),
    prisma.file.deleteMany(),
    prisma.auditLog.deleteMany(),
  ]);
}

async function nullUserFksOnMasterData() {
  await prisma.$executeRawUnsafe(`
    UPDATE opcos SET
      created_by_user_id = NULL,
      updated_by_user_id = NULL,
      deleted_by_user_id = NULL
  `);
  await prisma.$executeRawUnsafe(`
    UPDATE partners SET
      created_by_user_id = NULL,
      updated_by_user_id = NULL,
      deleted_by_user_id = NULL
  `);
  await prisma.$executeRawUnsafe(`
    UPDATE opco_partner_links SET
      created_by_user_id = NULL,
      updated_by_user_id = NULL,
      deleted_by_user_id = NULL
  `);
  await prisma.$executeRawUnsafe(`
    UPDATE currencies SET
      created_by_user_id = NULL,
      updated_by_user_id = NULL,
      deleted_by_user_id = NULL
  `);
  await prisma.$executeRawUnsafe(`
    UPDATE currency_monthly_rates SET
      created_by_user_id = NULL,
      updated_by_user_id = NULL,
      deleted_by_user_id = NULL
  `);
  await prisma.$executeRawUnsafe(`
    UPDATE lookup_types SET
      created_by_user_id = NULL,
      updated_by_user_id = NULL,
      deleted_by_user_id = NULL
  `);
  await prisma.$executeRawUnsafe(`
    UPDATE lookups SET
      created_by_user_id = NULL,
      updated_by_user_id = NULL,
      deleted_by_user_id = NULL
  `);
  await prisma.$executeRawUnsafe(`
    UPDATE notification_templates SET
      created_by_user_id = NULL,
      updated_by_user_id = NULL,
      deleted_by_user_id = NULL
  `);
  await prisma.$executeRawUnsafe(`
    UPDATE email_template_versions SET
      created_by_user_id = NULL
  `);
  await prisma.$executeRawUnsafe(`
    UPDATE users SET
      created_by_user_id = NULL,
      updated_by_user_id = NULL,
      deleted_by_user_id = NULL,
      opco_id = NULL,
      partner_id = NULL
  `);
}

async function clearOrgsAndUsers() {
  await nullUserFksOnMasterData();

  await prisma.user.deleteMany();
  await prisma.opcoPartnerLink.deleteMany();
  await prisma.partner.deleteMany();
  await prisma.opco.deleteMany();
}

async function main() {
  console.log("Clearing transactional data…");
  await clearTransactionalData();

  console.log("Clearing OpCos, Partners, links, and users…");
  await clearOrgsAndUsers();

  const counts = await Promise.all([
    prisma.report.count(),
    prisma.invoice.count(),
    prisma.reconciliation.count(),
    prisma.consolidation.count(),
    prisma.notification.count(),
    prisma.auditLog.count(),
    prisma.opco.count(),
    prisma.partner.count(),
    prisma.opcoPartnerLink.count(),
    prisma.user.count(),
  ]);

  console.log("Reset complete (before seed).");
  console.log(
    `Remaining — reports: ${counts[0]}, invoices: ${counts[1]}, reconciliations: ${counts[2]}, consolidations: ${counts[3]}, notifications: ${counts[4]}, audit logs: ${counts[5]}`,
  );
  console.log(
    `Remaining — opcos: ${counts[6]}, partners: ${counts[7]}, links: ${counts[8]}, users: ${counts[9]}`,
  );
  console.log(
    `Kept master data. Platform emails will be recreated by seed: ${PLATFORM_EMAILS.join(", ")}`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

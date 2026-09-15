/**
 * Client scratch reset — wipe operational data; keep org roster + Admin only.
 *
 * Deletes: reports, submissions, reconciliations, revenue share, invoices,
 * notifications, email deliveries, files, audit logs, cron ledger, rate-limit
 * buckets, and all non-Admin users (OpCo/Partner/Dizlee portal accounts).
 *
 * Keeps: OpCos, Partners, OpCo–Partner links, service partner maps, OpCo report
 * mappings, lookups, currencies, rates, app settings, notification templates,
 * and Admin-role users.
 *
 * Usage (DATABASE_URL = client DB):
 *
 *   npm run db:clear-client-scratch
 *
 * After testing, optionally re-run seed:client to reset Admin password:
 *
 *   CLIENT_ADMIN_EMAIL=... CLIENT_ADMIN_PASSWORD=... npm run seed:client
 *
 * Do NOT use npm run seed / db:reset-orgs on client (loads demo portal users).
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function clearTransactionalData() {
  await prisma.$transaction([
    prisma.emailDelivery.deleteMany(),
    prisma.notificationRead.deleteMany(),
    prisma.notificationAttachment.deleteMany(),
    prisma.notificationRecipient.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.invoiceActivityLog.deleteMany(),
    prisma.invoiceItem.deleteMany(),
    prisma.reconciliationItem.deleteMany(),
    prisma.reconciliation.deleteMany(),
    prisma.revenueShareReportItem.deleteMany(),
    prisma.revenueShareReport.deleteMany(),
    prisma.reportChangeRequest.deleteMany(),
    prisma.opcoSubmissionChangeRequest.deleteMany(),
    prisma.opcoPartnerLinkRequest.deleteMany(),
    prisma.reportLineItem.deleteMany(),
    prisma.report.deleteMany(),
    prisma.opcoReportSubmission.deleteMany(),
    prisma.invoice.deleteMany(),
    prisma.file.deleteMany(),
    prisma.auditLog.deleteMany(),
    prisma.authRateLimitBucket.deleteMany(),
    prisma.cronJobRun.deleteMany(),
  ]);
}

/** Clear user FKs on master data we keep so non-Admin users can be hard-deleted. */
async function nullUserFksOnKeptMasterData() {
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
    UPDATE service_partner_maps SET
      created_by_user_id = NULL,
      updated_by_user_id = NULL,
      deleted_by_user_id = NULL
  `);
  await prisma.$executeRawUnsafe(`
    UPDATE opco_report_mappings SET
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

async function deleteNonAdminUsers() {
  const adminRole = await prisma.lookup.findFirst({
    where: { code: "ADMIN", lookupType: { code: "USER_ROLE" } },
    select: { id: true },
  });
  if (!adminRole) {
    throw new Error(
      "ADMIN role lookup missing. Run npm run seed:client before clear-client-scratch.",
    );
  }

  const keepEmail = process.env.CLIENT_ADMIN_EMAIL?.trim().toLowerCase();

  const toDelete = await prisma.user.findMany({
    where: keepEmail
      ? {
          OR: [
            { roleId: { not: adminRole.id } },
            { roleId: adminRole.id, email: { not: keepEmail } },
          ],
        }
      : { roleId: { not: adminRole.id } },
    select: { id: true, email: true },
  });

  if (toDelete.length === 0) {
    return { deleted: 0, emails: [] as string[] };
  }

  const result = await prisma.user.deleteMany({
    where: { id: { in: toDelete.map((user) => user.id) } },
  });

  return {
    deleted: result.count,
    emails: toDelete.map((user) => user.email),
  };
}

async function main() {
  console.log("Client scratch: clearing transactional data…");
  await clearTransactionalData();

  console.log("Client scratch: clearing user FKs on kept master data…");
  await nullUserFksOnKeptMasterData();

  console.log("Client scratch: removing non-Admin portal users…");
  const removed = await deleteNonAdminUsers();

  const [
    reportCount,
    notificationCount,
    reconciliationCount,
    invoiceCount,
    rsCount,
    opcoCount,
    partnerCount,
    linkCount,
    mapCount,
    userCount,
    adminCount,
  ] = await Promise.all([
    prisma.report.count(),
    prisma.notification.count(),
    prisma.reconciliation.count(),
    prisma.invoice.count(),
    prisma.revenueShareReport.count(),
    prisma.opco.count({ where: { isDeleted: false } }),
    prisma.partner.count({ where: { isDeleted: false } }),
    prisma.opcoPartnerLink.count({ where: { isDeleted: false } }),
    prisma.servicePartnerMap.count({ where: { isDeleted: false } }),
    prisma.user.count({ where: { isDeleted: false } }),
    prisma.user.count({
      where: {
        isDeleted: false,
        role: { code: "ADMIN", lookupType: { code: "USER_ROLE" } },
      },
    }),
  ]);

  console.log("Client scratch complete:");
  console.log(`  Removed portal users: ${removed.deleted}`);
  if (removed.emails.length > 0 && removed.emails.length <= 20) {
    console.log(`  Removed emails: ${removed.emails.join(", ")}`);
  }
  console.log(
    `  Remaining tx — reports: ${reportCount}, notifications: ${notificationCount}, reconciliations: ${reconciliationCount}, invoices: ${invoiceCount}, RS: ${rsCount}`,
  );
  console.log(
    `  Kept — OpCos: ${opcoCount}, Partners: ${partnerCount}, links: ${linkCount}, service maps: ${mapCount}`,
  );
  console.log(`  Users: ${userCount} (Admin: ${adminCount})`);
  console.log(
    "  Optional: CLIENT_ADMIN_* npm run seed:client to reset Admin password",
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

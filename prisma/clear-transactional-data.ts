/**
 * Clears operational / transactional data only.
 *
 * Deletes: reports, submissions, invoices, reconciliations, Dizlee RS + Partner RS,
 * notifications, email deliveries, change/link/map requests, files, audit logs.
 *
 * Keeps: users (all roles), OpCos, Partners, links, OpCo report mappings,
 * service–partner maps (regulatory fee % + Partner RS %), lookups, currencies,
 * rates, app settings, email templates.
 *
 * Usage (local or production DATABASE_URL):
 *
 *   npm run db:clear-transactional
 *
 * Prefer this over db:clear-client-scratch when you must keep portal users.
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
    prisma.partnerRevenueShareReportItem.deleteMany(),
    prisma.partnerRevenueShareReport.deleteMany(),
    prisma.reconciliation.deleteMany(),
    prisma.revenueShareReportItem.deleteMany(),
    prisma.revenueShareReport.deleteMany(),
    prisma.reportChangeRequest.deleteMany(),
    prisma.opcoSubmissionChangeRequest.deleteMany(),
    prisma.opcoPartnerLinkRequest.deleteMany(),
    prisma.opcoReportMapRequest.deleteMany(),
    prisma.reportLineItem.deleteMany(),
    prisma.report.deleteMany(),
    prisma.opcoReportSubmission.deleteMany(),
    prisma.invoice.deleteMany(),
    prisma.file.deleteMany(),
    prisma.auditLog.deleteMany(),
  ]);

  const counts = await Promise.all([
    prisma.report.count(),
    prisma.opcoReportSubmission.count(),
    prisma.invoice.count(),
    prisma.reconciliation.count(),
    prisma.revenueShareReport.count(),
    prisma.partnerRevenueShareReport.count(),
    prisma.notification.count(),
    prisma.opcoPartnerLinkRequest.count(),
    prisma.opcoReportMapRequest.count(),
    prisma.opcoReportMapping.count(),
    prisma.servicePartnerMap.count({ where: { isDeleted: false } }),
    prisma.user.count({ where: { isDeleted: false } }),
    prisma.auditLog.count(),
  ]);

  console.log("Transactional data cleared.");
  console.log(
    `Remaining tx — reports: ${counts[0]}, submissions: ${counts[1]}, invoices: ${counts[2]}, reconciliations: ${counts[3]}, Dizlee RS: ${counts[4]}, Partner RS: ${counts[5]}, notifications: ${counts[6]}, partner link requests: ${counts[7]}, report map requests: ${counts[8]}, audit logs: ${counts[12]}`,
  );
  console.log(
    `Kept — report mappings: ${counts[9]}, service maps: ${counts[10]}, users: ${counts[11]}`,
  );
  console.log(
    "Kept: users, OpCos, Partners, links, report maps, fee/Partner RS %, settings, currencies, templates.",
  );
}

clearTransactionalData()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

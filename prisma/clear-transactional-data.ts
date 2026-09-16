/**
 * Clears operational data for local testing (reports, invoices, reconciliations, etc.)
 * Keeps: users, opcos, partners, links, lookups, currencies, app settings, email templates.
 * Also clears OpCo report maps + map requests so upload readiness can be retested from scratch.
 *
 * Usage: npm run db:clear-transactional
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
    prisma.opcoReportMapRequest.deleteMany(),
    prisma.reportLineItem.deleteMany(),
    prisma.report.deleteMany(),
    prisma.opcoReportSubmission.deleteMany(),
    prisma.invoice.deleteMany(),
    prisma.opcoReportMapping.deleteMany(),
    prisma.file.deleteMany(),
    prisma.auditLog.deleteMany(),
  ]);

  const counts = await Promise.all([
    prisma.report.count(),
    prisma.opcoReportSubmission.count(),
    prisma.invoice.count(),
    prisma.reconciliation.count(),
    prisma.revenueShareReport.count(),
    prisma.revenueShareReportItem.count(),
    prisma.notification.count(),
    prisma.opcoPartnerLinkRequest.count(),
    prisma.opcoReportMapRequest.count(),
    prisma.opcoReportMapping.count(),
    prisma.auditLog.count(),
  ]);

  console.log("Transactional data cleared.");
  console.log(
    `Remaining rows — reports: ${counts[0]}, submissions: ${counts[1]}, invoices: ${counts[2]}, reconciliations: ${counts[3]}, revenue share reports: ${counts[4]}, RS items: ${counts[5]}, notifications: ${counts[6]}, partner link requests: ${counts[7]}, report map requests: ${counts[8]}, report mappings: ${counts[9]}, audit logs: ${counts[10]}`,
  );
  console.log(
    "Kept: users, opcos, partners, links, settings, currencies, email templates.",
  );
  console.log(
    "Cleared OpCo report maps — Admin must reconfigure Report map before OpCo upload.",
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

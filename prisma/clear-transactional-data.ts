/**
 * Clears operational data for local testing (reports, invoices, reconciliations, etc.)
 * Keeps: users, opcos, partners, links, lookups, currencies, app settings, email templates.
 *
 * Usage: npm run db:clear-transactional
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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
    prisma.revenueShareReport.deleteMany(),
    prisma.reportChangeRequest.deleteMany(),
    prisma.reportLineItem.deleteMany(),
    prisma.report.deleteMany(),
    prisma.invoice.deleteMany(),
    prisma.file.deleteMany(),
    prisma.auditLog.deleteMany(),
  ]);

  const counts = await Promise.all([
    prisma.report.count(),
    prisma.invoice.count(),
    prisma.reconciliation.count(),
    prisma.consolidation.count(),
    prisma.revenueShareReport.count(),
    prisma.notification.count(),
    prisma.auditLog.count(),
  ]);

  console.log("Transactional data cleared.");
  console.log(
    `Remaining rows — reports: ${counts[0]}, invoices: ${counts[1]}, reconciliations: ${counts[2]}, consolidations: ${counts[3]}, revenue share reports: ${counts[4]}, notifications: ${counts[5]}, audit logs: ${counts[6]}`,
  );
  console.log("Kept: users, opcos, partners, settings, currencies, email templates.");
}

clearTransactionalData()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

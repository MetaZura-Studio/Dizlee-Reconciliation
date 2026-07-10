import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const reports = await prisma.report.findMany({
    select: { id: true, fileId: true },
  });

  if (reports.length === 0) {
    console.log("No reports to delete.");
    return;
  }

  const reportIds = reports.map((report) => report.id);
  const fileIds = reports
    .map((report) => report.fileId)
    .filter((fileId): fileId is bigint => fileId !== null);

  const reconciliations = await prisma.reconciliation.findMany({
    where: {
      OR: [
        { opcoReportId: { in: reportIds } },
        { partnerReportId: { in: reportIds } },
      ],
    },
    select: { id: true },
  });

  const reconciliationIds = reconciliations.map((row) => row.id);

  const [
    reconciliationItemsDeleted,
    reconciliationsDeleted,
    changeRequestsDeleted,
    lineItemsDeleted,
    consolidationItemsDeleted,
    consolidationsDeleted,
    reportsDeleted,
    filesDeleted,
  ] = await prisma.$transaction([
    prisma.reconciliationItem.deleteMany({
      where: { reconciliationId: { in: reconciliationIds } },
    }),
    prisma.reconciliation.deleteMany({
      where: { id: { in: reconciliationIds } },
    }),
    prisma.reportChangeRequest.deleteMany({
      where: { reportId: { in: reportIds } },
    }),
    prisma.reportLineItem.deleteMany({
      where: { reportId: { in: reportIds } },
    }),
    prisma.consolidationItem.deleteMany({}),
    prisma.consolidation.deleteMany({}),
    prisma.report.deleteMany({ where: { id: { in: reportIds } } }),
    prisma.file.deleteMany({
      where: { id: { in: fileIds } },
    }),
  ]);

  console.log("Deleted:");
  console.log(`  Reports: ${reportsDeleted.count}`);
  console.log(`  Line items: ${lineItemsDeleted.count}`);
  console.log(`  Change requests: ${changeRequestsDeleted.count}`);
  console.log(`  Reconciliations: ${reconciliationsDeleted.count}`);
  console.log(`  Reconciliation items: ${reconciliationItemsDeleted.count}`);
  console.log(`  Consolidations: ${consolidationsDeleted.count}`);
  console.log(`  Consolidation items: ${consolidationItemsDeleted.count}`);
  console.log(`  Files: ${filesDeleted.count}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

/**
 * Export local service_partner_maps to Excel for Admin import on another env.
 *
 *   npx tsx scripts/export-service-partner-maps-excel.ts
 *   npx tsx scripts/export-service-partner-maps-excel.ts "/path/out.xlsx"
 *
 * Headers match Admin import: OpCo | Partner | Service
 */

import { writeFileSync } from "node:fs";
import path from "node:path";

import ExcelJS from "exceljs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const outPath =
    process.argv[2]?.trim() ||
    path.join(process.cwd(), "service-partner-maps-export.xlsx");

  const rows = await prisma.servicePartnerMap.findMany({
    where: { isDeleted: false },
    orderBy: [{ opcoId: "asc" }, { serviceName: "asc" }],
    select: {
      serviceName: true,
      opco: { select: { name: true } },
      partner: { select: { name: true } },
    },
  });

  if (rows.length === 0) {
    throw new Error("No service_partner_maps found locally (isDeleted=false).");
  }

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("ServicePartnerMaps");
  sheet.addRow(["OpCo", "Partner", "Service"]);
  sheet.getRow(1).font = { bold: true };
  sheet.getColumn(1).width = 22;
  sheet.getColumn(2).width = 28;
  sheet.getColumn(3).width = 40;

  for (const row of rows) {
    sheet.addRow([row.opco.name, row.partner.name, row.serviceName]);
  }

  const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
  writeFileSync(outPath, buffer);

  console.log(`Wrote ${rows.length} rows → ${outPath}`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

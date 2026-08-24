/**
 * Replace all Service–Partner map rows from the OpCo-wise Partner-wise Service listing.
 * Hard-deletes existing maps, then inserts every sheet row (service names as written).
 *
 * Usage:
 *   npx tsx scripts/replace-service-partner-maps-from-excel.ts
 *   npx tsx scripts/replace-service-partner-maps-from-excel.ts "/path/to/file.xlsx"
 */
import ExcelJS from "exceljs";
import { PrismaClient } from "@prisma/client";

import {
  canonicalOpcoName,
  canonicalPartnerName,
  normalizeOrgKey,
} from "../lib/platform/opco-partner-roster";
import {
  matchLinkedPartner,
  normalizeServiceKey,
} from "../lib/platform/service-partner-map";

const DEFAULT_EXCEL =
  "/Users/hussnainnawaz/Downloads/OpCo wise-Partnerwise-Service Listing_corrected.xlsx";

const prisma = new PrismaClient();

function cellText(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "object" && "text" in value && typeof value.text === "string") {
    return value.text.trim();
  }
  if (typeof value === "object" && "result" in value) {
    return String(value.result ?? "").trim();
  }
  return String(value).trim();
}

type SheetRow = {
  rowNumber: number;
  opcoName: string;
  partnerName: string;
  serviceName: string;
};

type InsertRow = {
  opcoId: bigint;
  opcoName: string;
  serviceName: string;
  serviceKey: string;
  partnerId: bigint;
  partnerName: string;
};

async function parseListing(filePath: string): Promise<SheetRow[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const sheet = workbook.worksheets[0];
  if (!sheet) {
    throw new Error("Excel has no worksheets");
  }

  const header = sheet.getRow(1);
  const headers = [
    cellText(header.getCell(1).value).toLowerCase(),
    cellText(header.getCell(2).value).toLowerCase(),
    cellText(header.getCell(3).value).toLowerCase(),
  ];
  if (headers[0] !== "opco" || headers[1] !== "partner" || headers[2] !== "service") {
    throw new Error(
      `Unexpected headers: expected OpCo / Partner / Service, got ${headers.join(" / ")}`,
    );
  }

  const rows: SheetRow[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      return;
    }
    const opcoName = cellText(row.getCell(1).value);
    const partnerName = cellText(row.getCell(2).value);
    const serviceName = cellText(row.getCell(3).value);
    if (!opcoName && !partnerName && !serviceName) {
      return;
    }
    rows.push({ rowNumber, opcoName, partnerName, serviceName });
  });
  return rows;
}

function matchOpco(
  excelName: string,
  opcos: { id: bigint; name: string }[],
): { id: bigint; name: string } | null {
  const canonical = canonicalOpcoName(excelName);
  const key = normalizeOrgKey(canonical);
  return opcos.find((opco) => normalizeOrgKey(opco.name) === key) ?? null;
}

async function main() {
  const filePath = process.argv[2]?.trim() || DEFAULT_EXCEL;
  const sheetRows = await parseListing(filePath);

  const [opcos, partners] = await Promise.all([
    prisma.opco.findMany({
      where: { isDeleted: false },
      select: { id: true, name: true },
    }),
    prisma.partner.findMany({
      where: { isDeleted: false },
      select: { id: true, name: true },
    }),
  ]);
  const partnerNames = partners.map((partner) => partner.name);

  const unique = new Map<string, InsertRow>();
  const unknownOpcos = new Map<string, number>();
  const unknownPartners = new Map<string, number>();
  const missingService: number[] = [];
  const sameOpcoServiceDuplicates: string[] = [];

  for (const row of sheetRows) {
    if (!row.serviceName) {
      missingService.push(row.rowNumber);
      continue;
    }
    if (!row.opcoName) {
      unknownOpcos.set(
        `(blank row ${row.rowNumber})`,
        (unknownOpcos.get(`(blank row ${row.rowNumber})`) ?? 0) + 1,
      );
      continue;
    }
    if (!row.partnerName) {
      unknownPartners.set(
        `(blank row ${row.rowNumber})`,
        (unknownPartners.get(`(blank row ${row.rowNumber})`) ?? 0) + 1,
      );
      continue;
    }

    const opco = matchOpco(row.opcoName, opcos);
    if (!opco) {
      unknownOpcos.set(row.opcoName, (unknownOpcos.get(row.opcoName) ?? 0) + 1);
      continue;
    }

    const canonicalPartner = canonicalPartnerName(row.partnerName, partnerNames);
    const matched = matchLinkedPartner(canonicalPartner, partners);
    if (!matched) {
      unknownPartners.set(
        row.partnerName,
        (unknownPartners.get(row.partnerName) ?? 0) + 1,
      );
      continue;
    }

    const serviceKey = normalizeServiceKey(row.serviceName);
    const mapKey = `${opco.id.toString()}::${serviceKey}`;
    const existing = unique.get(mapKey);
    if (existing) {
      sameOpcoServiceDuplicates.push(
        `${opco.name} / ${row.serviceName}: last-wins ${matched.name} over ${existing.partnerName} (row ${row.rowNumber})`,
      );
    }
    unique.set(mapKey, {
      opcoId: opco.id,
      opcoName: opco.name,
      serviceName: row.serviceName,
      serviceKey,
      partnerId: matched.id,
      partnerName: matched.name,
    });
  }

  const previousCount = await prisma.servicePartnerMap.count();

  await prisma.$transaction(async (tx) => {
    await tx.servicePartnerMap.deleteMany({});
    for (const row of unique.values()) {
      await tx.servicePartnerMap.create({
        data: {
          opcoId: row.opcoId,
          serviceName: row.serviceName,
          serviceKey: row.serviceKey,
          partnerId: row.partnerId,
        },
      });
    }
  });

  console.log(`Source: ${filePath}`);
  console.log(`Sheet rows: ${sheetRows.length}`);
  console.log(`Previous maps deleted: ${previousCount}`);
  console.log(`New maps inserted: ${unique.size}`);
  console.log(`Skipped missing service name: ${missingService.length}`);
  console.log(`Unknown OpCos: ${unknownOpcos.size}`);
  for (const [name, count] of [...unknownOpcos.entries()].sort()) {
    console.log(`  - ${name} (${count})`);
  }
  console.log(`Unknown partners: ${unknownPartners.size}`);
  for (const [name, count] of [...unknownPartners.entries()].sort()) {
    console.log(`  - ${name} (${count})`);
  }
  console.log(
    `Same OpCo + service (last-wins, not dropped across OpCos): ${sameOpcoServiceDuplicates.length}`,
  );
  for (const line of sameOpcoServiceDuplicates) {
    console.log(`  - ${line}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

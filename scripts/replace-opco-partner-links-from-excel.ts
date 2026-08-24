/**
 * Replace all OpCo–Partner links from the Excel listing.
 * Creates missing partners, soft-deletes every existing link, then upserts Excel pairs.
 *
 * Usage:
 *   npx tsx scripts/replace-opco-partner-links-from-excel.ts
 *   npx tsx scripts/replace-opco-partner-links-from-excel.ts "/path/to/file.xlsx"
 */
import { PrismaClient } from "@prisma/client";

import {
  normalizeOrgKey,
  parseOpcoPartnerRosterPairs,
  slugifyPartnerName,
} from "../lib/platform/opco-partner-roster";

const DEFAULT_EXCEL =
  "/Users/hussnainnawaz/Downloads/OpCo wise-Partnerwise-Service Listing (1).xlsx";

const prisma = new PrismaClient();

async function main() {
  const filePath = process.argv[2]?.trim() || DEFAULT_EXCEL;

  const activeStatus = await prisma.lookup.findFirst({
    where: { code: "ACTIVE", lookupType: { code: "USER_STATUS" } },
    select: { id: true },
  });
  if (!activeStatus) {
    throw new Error("USER_STATUS.ACTIVE lookup is missing");
  }

  const opcos = await prisma.opco.findMany({
    where: { isDeleted: false },
    select: { id: true, name: true },
  });
  const partners = await prisma.partner.findMany({
    select: { id: true, name: true, isDeleted: true },
  });

  const opcoByKey = new Map(
    opcos.map((row) => [normalizeOrgKey(row.name), row]),
  );
  const partnerByKey = new Map(
    partners.map((row) => [normalizeOrgKey(row.name), row]),
  );

  const pairs = await parseOpcoPartnerRosterPairs(
    filePath,
    partners.map((row) => row.name),
  );

  const unmatchedOpcos = new Set<string>();
  const createdPartners: string[] = [];
  const resolved: Array<{ opcoId: bigint; partnerId: bigint; opcoName: string; partnerName: string }> =
    [];

  for (const pair of pairs) {
    const opco = opcoByKey.get(normalizeOrgKey(pair.opcoName));
    if (!opco) {
      unmatchedOpcos.add(pair.opcoName);
      continue;
    }

    let partner = partnerByKey.get(normalizeOrgKey(pair.partnerName));
    if (!partner) {
      const created = await prisma.partner.create({
        data: {
          name: pair.partnerName,
          statusId: activeStatus.id,
          isDeleted: false,
        },
        select: { id: true, name: true, isDeleted: true },
      });
      partner = created;
      partnerByKey.set(normalizeOrgKey(created.name), created);
      createdPartners.push(`${created.name} (${slugifyPartnerName(created.name)})`);
    } else if (partner.isDeleted) {
      await prisma.partner.update({
        where: { id: partner.id },
        data: {
          isDeleted: false,
          deletedAt: null,
          deletedByUserId: null,
          statusId: activeStatus.id,
          name: pair.partnerName,
        },
      });
      partner = { ...partner, isDeleted: false, name: pair.partnerName };
      partnerByKey.set(normalizeOrgKey(partner.name), partner);
    }

    resolved.push({
      opcoId: opco.id,
      partnerId: partner.id,
      opcoName: opco.name,
      partnerName: partner.name,
    });
  }

  if (unmatchedOpcos.size > 0) {
    throw new Error(
      `Unmatched OpCos (must be 0): ${[...unmatchedOpcos].join(", ")}`,
    );
  }

  const now = new Date();
  const softDeleted = await prisma.opcoPartnerLink.updateMany({
    data: {
      isDeleted: true,
      deletedAt: now,
    },
  });

  for (const link of resolved) {
    await prisma.opcoPartnerLink.upsert({
      where: {
        opcoId_partnerId: { opcoId: link.opcoId, partnerId: link.partnerId },
      },
      create: {
        opcoId: link.opcoId,
        partnerId: link.partnerId,
        isDeleted: false,
      },
      update: {
        isDeleted: false,
        deletedAt: null,
        deletedByUserId: null,
      },
    });
  }

  const perOpco = new Map<string, number>();
  for (const link of resolved) {
    perOpco.set(link.opcoName, (perOpco.get(link.opcoName) ?? 0) + 1);
  }

  const activeLinks = await prisma.opcoPartnerLink.count({
    where: { isDeleted: false },
  });

  console.log("Excel:", filePath);
  console.log("Unique pairs parsed:", pairs.length);
  console.log("Created partners:", createdPartners.length);
  for (const name of createdPartners) {
    console.log("  +", name);
  }
  console.log("Soft-deleted previous links:", softDeleted.count);
  console.log("Active links now:", activeLinks);
  console.log("Links per OpCo:");
  for (const name of [...perOpco.keys()].sort()) {
    console.log(`  ${name}: ${perOpco.get(name)}`);
  }
  const southSudan = opcos.find(
    (row) => normalizeOrgKey(row.name) === "zainsouthsudan",
  );
  if (southSudan) {
    const count = await prisma.opcoPartnerLink.count({
      where: { opcoId: southSudan.id, isDeleted: false },
    });
    console.log(`  ${southSudan.name}: ${count} (not in Excel)`);
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

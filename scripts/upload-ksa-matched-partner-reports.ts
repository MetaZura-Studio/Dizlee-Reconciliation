/**
 * Upload all matched Zain KSA Partner sample Excels for a period (local test helper).
 * Writes files under `.uploads/reports/` and creates Partner-lane report rows.
 *
 * Usage:
 *   node --import tsx scripts/upload-ksa-matched-partner-reports.ts
 *   node --import tsx scripts/upload-ksa-matched-partner-reports.ts --month=9 --year=2026
 */
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { Prisma, PrismaClient } from "@prisma/client";

import { parseReportWorkbook } from "../lib/partner/excel/parse-report";
import { snapshotFxOntoParsedLines } from "../lib/platform/report-fx";
import { BASE_CURRENCY_RATE } from "../lib/platform/currency-rates";
import {
  laneReportWhere,
  OPCO_REPORT_VERSION,
  PARTNER_REPORT_VERSION,
} from "../lib/platform/reports/sides";
import { portalEmail } from "../prisma/seed-data/helpers";
import { PARTNER_SEEDS } from "../prisma/seed-data/partners";

const prisma = new PrismaClient();

const PARTNER_DIR = path.join(
  process.cwd(),
  "Reports",
  "Zain KSA - Matched Samples",
  "partners",
);

function parseArgs(argv: string[]): {
  month: number;
  year: number;
  skip: Set<string>;
} {
  let month = 9;
  let year = 2026;
  const skip = new Set<string>();
  for (const arg of argv) {
    const monthMatch = /^--month=(\d+)$/.exec(arg);
    if (monthMatch) month = Number(monthMatch[1]);
    const yearMatch = /^--year=(\d+)$/.exec(arg);
    if (yearMatch) year = Number(yearMatch[1]);
    const skipMatch = /^--skip=(.+)$/.exec(arg);
    if (skipMatch) {
      for (const slug of skipMatch[1].split(",")) {
        const trimmed = slug.trim().toLowerCase();
        if (trimmed) skip.add(trimmed);
      }
    }
  }
  return { month, year, skip };
}

function sanitizeFilename(filename: string): string {
  const base = path.posix.basename(filename).replace(/[^\w.\-()+ ]+/g, "_");
  return base.length > 0 ? base : "upload.bin";
}

async function saveReportBuffer(buffer: Buffer, filename: string) {
  const checksum = createHash("sha256").update(buffer).digest("hex");
  const storageKey = path.posix.join(
    "reports",
    randomUUID(),
    sanitizeFilename(filename),
  );
  const absolutePath = path.resolve(process.cwd(), ".uploads", storageKey);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, buffer);
  return {
    storageKey,
    checksum,
    sizeBytes: BigInt(buffer.byteLength),
  };
}

async function main() {
  const { month, year, skip } = parseArgs(process.argv.slice(2));

  const opco = await prisma.opco.findFirst({
    where: { name: "Zain KSA", isDeleted: false },
    select: { id: true, name: true, defaultCurrencyId: true },
  });
  if (!opco) {
    throw new Error("Zain KSA not found");
  }

  const submittedStatus = await prisma.lookup.findFirst({
    where: {
      code: "SUBMITTED",
      lookupType: { code: "REPORT_STATUS" },
    },
    select: { id: true },
  });
  if (!submittedStatus) {
    throw new Error("SUBMITTED report status missing");
  }

  const opcoPartners = await prisma.report.findMany({
    where: {
      opcoId: opco.id,
      month,
      year,
      version: OPCO_REPORT_VERSION,
      isDeleted: false,
    },
    select: {
      partnerId: true,
      partner: { select: { name: true } },
    },
    orderBy: { partner: { name: "asc" } },
  });

  if (opcoPartners.length === 0) {
    throw new Error(
      `No OpCo-lane reports for Zain KSA ${month}/${year}. Upload OpCo first.`,
    );
  }

  const files = (await readdir(PARTNER_DIR)).filter((name) =>
    name.endsWith(".xlsx"),
  );

  console.log(
    `Uploading matched Partner reports for ${opco.name} ${month}/${year} (${opcoPartners.length} OpCo partners)`,
  );
  if (skip.size > 0) {
    console.log(`Skipping: ${[...skip].join(", ")}`);
  }

  for (const row of opcoPartners) {
    const seed = PARTNER_SEEDS.find(
      (item) => item.name.toLowerCase() === row.partner.name.toLowerCase(),
    );
    if (!seed) {
      throw new Error(`No seed for partner ${row.partner.name}`);
    }
    if (skip.has(seed.slug)) {
      console.log(`skip ${seed.slug}: requested via --skip`);
      continue;
    }

    const filename = files.find((name) =>
      name.startsWith(`partner-${seed.slug}-`),
    );
    if (!filename) {
      throw new Error(
        `Missing matched sample for ${seed.slug} in ${PARTNER_DIR}`,
      );
    }

    const existing = await prisma.report.findFirst({
      where: laneReportWhere("partner", {
        opcoId: opco.id,
        partnerId: row.partnerId,
        year,
        month,
      }),
      select: { id: true },
    });
    if (existing) {
      console.log(`skip ${seed.slug}: already uploaded (report ${existing.id})`);
      continue;
    }

    const user = await prisma.user.findFirst({
      where: {
        email: portalEmail(seed.slug),
        isDeleted: false,
        partnerId: row.partnerId,
      },
      select: { id: true },
    });
    if (!user) {
      throw new Error(`No user ${portalEmail(seed.slug)} for ${seed.name}`);
    }

    const buffer = await readFile(path.join(PARTNER_DIR, filename));
    const parsed = await parseReportWorkbook(buffer);
    const lineItems = snapshotFxOntoParsedLines(parsed, BASE_CURRENCY_RATE);
    const saved = await saveReportBuffer(buffer, filename);

    const file = await prisma.file.create({
      data: {
        filename,
        storageKey: saved.storageKey,
        mimeType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        sizeBytes: saved.sizeBytes,
        checksum: saved.checksum,
        uploadedByUserId: user.id,
      },
    });

    const report = await prisma.report.create({
      data: {
        month,
        year,
        opcoId: opco.id,
        partnerId: row.partnerId,
        fileId: file.id,
        currencyId: opco.defaultCurrencyId,
        statusId: submittedStatus.id,
        version: PARTNER_REPORT_VERSION,
        createdByUserId: user.id,
        uploadedByUserId: user.id,
        updatedByUserId: user.id,
        lineItems: {
          create: lineItems.map((item) => ({
            lineNumber: item.lineNumber,
            description: item.description,
            usageAmount: item.usageAmount,
            usageUsd: item.usageUsd,
            amount: item.amount,
            revenueSharePercent: item.revenueSharePercent,
            exchangeRate: item.exchangeRate,
            usageUnit: item.usageUnit,
            reconciliationBasis: item.reconciliationBasis,
            sourceColumns: item.sourceColumns as Prisma.InputJsonValue,
          })),
        },
      },
      select: { id: true },
    });

    console.log(
      `✓ ${seed.slug}: reportId=${report.id.toString()} lines=${lineItems.length} file=${filename}`,
    );
  }

  console.log("Done. In Dizlee, run recon for each partner, then generate RS.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

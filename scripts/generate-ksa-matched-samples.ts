/**
 * Zain KSA matched OpCo + Partner sample pack from live OpCo-lane reports.
 *
 * Reads OpCo report line items (version 1) for the target period and writes:
 * - one OpCo Excel with exact VENDORNAME / SERVICENAME / ORIGINALAMOUNT
 * - one Partner Excel per partner with the same service names and USD amounts
 *   using recon FX rounding (`applyReportFxToAmount`)
 *
 * Output: Reports/Zain KSA - Matched Samples/
 *
 * Usage:
 *   node --import tsx scripts/generate-ksa-matched-samples.ts
 *   node --import tsx scripts/generate-ksa-matched-samples.ts --month=9 --year=2026
 */
import ExcelJS from "exceljs";
import path from "node:path";
import { mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { PrismaClient } from "@prisma/client";

import { portalEmail } from "../prisma/seed-data/helpers";
import { PARTNER_SEEDS } from "../prisma/seed-data/partners";
import {
  applyReportFxToAmount,
  getOpcoReportFx,
} from "../lib/platform/report-fx";
import {
  compareReportLines,
  type CompareLineInput,
} from "../lib/dizlee/reconciliation/compare";
import { OPCO_REPORT_VERSION } from "../lib/platform/reports/sides";
import { formatPeriodLabel } from "../lib/partner/period";

const prisma = new PrismaClient();

const OUT_DIR = path.join(
  process.cwd(),
  "Reports",
  "Zain KSA - Matched Samples",
);
const OPCO_DIR = path.join(OUT_DIR, "opco");
const PARTNER_DIR = path.join(OUT_DIR, "partners");

type ServiceLine = {
  service: string;
  amountSar: number;
};

type PartnerPack = {
  slug: string;
  name: string;
  lines: ServiceLine[];
};

function parseArgs(argv: string[]): { month: number; year: number } {
  let month = 9;
  let year = 2026;
  for (const arg of argv) {
    const monthMatch = /^--month=(\d+)$/.exec(arg);
    if (monthMatch) {
      month = Number(monthMatch[1]);
    }
    const yearMatch = /^--year=(\d+)$/.exec(arg);
    if (yearMatch) {
      year = Number(yearMatch[1]);
    }
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error(`Invalid --month=${month}`);
  }
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new Error(`Invalid --year=${year}`);
  }
  return { month, year };
}

function fileSuffix(month: number, year: number): string {
  const labels = [
    "jan",
    "feb",
    "mar",
    "apr",
    "may",
    "jun",
    "jul",
    "aug",
    "sep",
    "oct",
    "nov",
    "dec",
  ];
  return `${labels[month - 1]}${String(year).slice(-2)}`;
}

function usdFromSar(amountSar: number, rateToUsd: number): number {
  const converted = applyReportFxToAmount(amountSar, rateToUsd);
  if (converted.amountUsd === null) {
    throw new Error(`FX failed for SAR ${amountSar}`);
  }
  return Number(converted.amountUsd);
}

function seedForPartnerName(name: string) {
  const seed = PARTNER_SEEDS.find(
    (item) => item.name.toLowerCase() === name.toLowerCase(),
  );
  if (!seed) {
    throw new Error(`No seed slug for partner ${name}`);
  }
  return seed;
}

async function clearXlsx(dir: string): Promise<void> {
  await mkdir(dir, { recursive: true });
  const entries = await readdir(dir);
  await Promise.all(
    entries
      .filter((name) => name.endsWith(".xlsx"))
      .map((name) => rm(path.join(dir, name))),
  );
}

async function loadPacksFromOpcoReports(params: {
  opcoId: bigint;
  month: number;
  year: number;
}): Promise<PartnerPack[]> {
  const reports = await prisma.report.findMany({
    where: {
      opcoId: params.opcoId,
      month: params.month,
      year: params.year,
      version: OPCO_REPORT_VERSION,
      isDeleted: false,
    },
    include: {
      partner: { select: { name: true } },
      lineItems: {
        where: { isDeleted: false },
        select: { description: true, amount: true },
        orderBy: { lineNumber: "asc" },
      },
    },
    orderBy: { partner: { name: "asc" } },
  });

  if (reports.length === 0) {
    throw new Error(
      `No OpCo-lane reports for Zain KSA ${params.month}/${params.year}. Upload the OpCo report first.`,
    );
  }

  return reports.map((report) => {
    const seed = seedForPartnerName(report.partner.name);
    const lines = report.lineItems.map((line) => {
      const amountSar = Number(line.amount);
      if (!Number.isFinite(amountSar)) {
        throw new Error(
          `Invalid amount for ${report.partner.name} / ${line.description}`,
        );
      }
      return {
        service: line.description?.trim() || "Unknown",
        amountSar,
      };
    });
    if (lines.length === 0) {
      throw new Error(`No line items for partner ${report.partner.name}`);
    }
    return { slug: seed.slug, name: seed.name, lines };
  });
}

function assertAllMatched(packs: PartnerPack[], rateToUsd: number): void {
  let lineId = BigInt(1);
  for (const pack of packs) {
    const opcoLines: CompareLineInput[] = pack.lines.map((line, index) => ({
      lineId: lineId++,
      description: line.service,
      lineNumber: index + 1,
      usageUsd: null,
      usageAmount: null,
      amount: usdFromSar(line.amountSar, rateToUsd),
    }));
    const partnerLines: CompareLineInput[] = pack.lines.map((line, index) => ({
      lineId: lineId++,
      description: line.service,
      lineNumber: index + 1,
      usageUsd: null,
      usageAmount: null,
      amount: usdFromSar(line.amountSar, rateToUsd),
    }));

    const compared = compareReportLines(opcoLines, partnerLines, 0);
    const bad = compared.filter((row) => row.matchStatus !== "MATCHED");
    if (bad.length > 0) {
      throw new Error(
        `Expected all MATCHED for ${pack.name}, got: ${JSON.stringify(bad)}`,
      );
    }
  }
}

async function writeOpcoWorkbook(
  packs: PartnerPack[],
  filename: string,
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Report");
  sheet.addRow(["VENDORNAME", "SERVICENAME", "ORIGINALAMOUNT"]);
  sheet.getRow(1).font = { bold: true };

  for (const pack of packs) {
    for (const line of pack.lines) {
      sheet.addRow([pack.name, line.service, line.amountSar]);
    }
  }

  sheet.columns = [{ width: 22 }, { width: 28 }, { width: 18 }];
  await writeFile(
    path.join(OPCO_DIR, filename),
    Buffer.from(await workbook.xlsx.writeBuffer()),
  );
}

async function writePartnerWorkbook(
  pack: PartnerPack,
  rateToUsd: number,
  filename: string,
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Report");
  sheet.addRow([
    "Merchant",
    "Service name",
    "Application name",
    "SC",
    "Gross amount (USD)",
  ]);
  sheet.getRow(1).font = { bold: true };

  for (const line of pack.lines) {
    const usd = usdFromSar(line.amountSar, rateToUsd);
    sheet.addRow([pack.name, line.service, line.service, "", usd]);
  }

  sheet.columns = [
    { width: 18 },
    { width: 28 },
    { width: 28 },
    { width: 8 },
    { width: 18 },
  ];
  await writeFile(
    path.join(PARTNER_DIR, filename),
    Buffer.from(await workbook.xlsx.writeBuffer()),
  );
}

async function main() {
  const { month, year } = parseArgs(process.argv.slice(2));
  const periodLabel = formatPeriodLabel(year, month);
  const suffix = fileSuffix(month, year);

  const opco = await prisma.opco.findFirst({
    where: { name: "Zain KSA", isDeleted: false },
    select: { id: true },
  });
  if (!opco) {
    throw new Error("Zain KSA not found");
  }

  const fx = await getOpcoReportFx({ opcoId: opco.id, month, year });
  const rateToUsd = fx.rateToUsd;
  if (rateToUsd == null) {
    throw new Error(
      `No USD rate for Zain KSA ${periodLabel} — set Admin monthly rates.`,
    );
  }

  const packs = await loadPacksFromOpcoReports({
    opcoId: opco.id,
    month,
    year,
  });
  assertAllMatched(packs, rateToUsd);

  await clearXlsx(OPCO_DIR);
  await clearXlsx(PARTNER_DIR);

  const opcoFilename = `opco-zain-ksa-matched-${suffix}.xlsx`;
  await writeOpcoWorkbook(packs, opcoFilename);

  const notes: string[] = [
    "# Zain KSA — matched sample reports",
    "",
    "Built from **live OpCo-lane reports** in the DB for this period.",
    "Partner files use the same service names and USD amounts as recon FX rounding.",
    "",
    "## Period",
    `- Upload month/year: **${periodLabel}** (${month}/${year})`,
    `- OpCo currency: **${fx.currencyCode}**`,
    `- Admin ${fx.currencyCode} → USD rate: **${rateToUsd}**`,
    "- Partner **Gross amount (USD)** is already USD (same rounding as recon)",
    "",
    "## How to use",
    "1. If OpCo already uploaded this period, skip the OpCo file (or use Report History reupload after approval).",
    `2. Otherwise upload \`opco/${opcoFilename}\` as OpCo \`zain-ksa@dizlee.com\` / \`Password123!\` for **${periodLabel}**`,
    "3. Upload each Partner file below for the same OpCo + period",
    "4. Dizlee recon should show **MATCHED** for every service",
    "",
    "## Files",
    "",
    "### OpCo",
    `- \`opco/${opcoFilename}\` — ${packs.reduce((n, p) => n + p.lines.length, 0)} rows across ${packs.length} partners`,
    "",
    "### Partners (one file each)",
    "",
  ];

  for (const pack of packs) {
    const filename = `partner-${pack.slug}-zain-ksa-matched-${suffix}.xlsx`;
    await writePartnerWorkbook(pack, rateToUsd, filename);
    const totalUsd = pack.lines.reduce(
      (sum, line) => sum + usdFromSar(line.amountSar, rateToUsd),
      0,
    );
    const services = pack.lines
      .map((line) => `${line.service}=${line.amountSar} SAR`)
      .join("; ");
    notes.push(
      `- \`partners/${filename}\` — \`${portalEmail(pack.slug)}\` / \`Password123!\` — ${pack.lines.length} service(s), total USD ${totalUsd.toFixed(2)} — ${services}`,
    );
    console.log(
      `${pack.slug}: ${pack.lines.length} lines — ${services} → USD ${totalUsd.toFixed(2)}`,
    );
  }

  notes.push(
    "",
    "## Notes",
    "- Values come from OpCo report line items already uploaded for this period (not synthetic).",
    "- Centili should only include services present on the OpCo side (e.g. Gamemine), not invented rows.",
    "- Re-run: `node --import tsx scripts/generate-ksa-matched-samples.ts --month=9 --year=2026`",
    "",
  );

  await writeFile(path.join(OUT_DIR, "README.md"), `${notes.join("\n")}\n`);
  console.log(`Wrote matched pack to ${OUT_DIR}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

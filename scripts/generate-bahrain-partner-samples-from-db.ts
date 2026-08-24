/**
 * Zain Bahrain Partner samples from the live OpCo upload (Aug 2026).
 * Aggregates OpCo lines by service; Gross Amount is USD (BHD × Admin rate).
 */
import ExcelJS from "exceljs";
import path from "node:path";
import { mkdir, readdir, unlink, writeFile } from "node:fs/promises";
import { PrismaClient } from "@prisma/client";

import { portalEmail } from "../prisma/seed-data/helpers";
import { PARTNER_SEEDS } from "../prisma/seed-data/partners";
import { getOpcoReportFx } from "../lib/platform/report-fx";

const prisma = new PrismaClient();
const OUT_DIR = path.join(
  process.cwd(),
  "Reports",
  "Partner Reports- Samples",
  "zain-bahrain",
);

const MONTH = 8;
const YEAR = 2026;

function normService(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function slugForPartnerName(name: string): string | null {
  const seed = PARTNER_SEEDS.find(
    (item) => item.name.toLowerCase() === name.toLowerCase(),
  );
  return seed?.slug ?? null;
}

async function main() {
  const opco = await prisma.opco.findFirst({
    where: { name: "Zain Bahrain", isDeleted: false },
    select: { id: true, name: true },
  });
  if (!opco) {
    throw new Error("Zain Bahrain not found");
  }

  const fx = await getOpcoReportFx({
    opcoId: opco.id,
    month: MONTH,
    year: YEAR,
  });
  if (fx.rateToUsd == null) {
    throw new Error(
      `No USD rate for Zain Bahrain ${YEAR}-${String(MONTH).padStart(2, "0")}`,
    );
  }

  const reports = await prisma.report.findMany({
    where: {
      opcoId: opco.id,
      month: MONTH,
      year: YEAR,
      isDeleted: false,
      uploadedByUser: { role: { code: "OPCO" } },
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
    throw new Error("No Zain Bahrain OpCo reports for August 2026");
  }

  await mkdir(OUT_DIR, { recursive: true });
  for (const file of await readdir(OUT_DIR)) {
    if (file.endsWith(".xlsx") || file === "README.md") {
      await unlink(path.join(OUT_DIR, file));
    }
  }

  const notes: string[] = [
    "# Zain Bahrain Partner samples (from live OpCo upload)",
    "",
    "Period on the uploaded OpCo report: **August 2026**.",
    `USD rate used: **${fx.rateToUsd}** (${fx.currencyCode} → USD).`,
    "Partner **Gross Amount** is USD so it matches recon (OpCo BHD × rate).",
    "Services are aggregated from the OpCo upload (same services / USD totals).",
    "Upload each file as that Partner for **Zain Bahrain / August 2026**.",
    "",
    "## OpCo",
    `- Login: \`${portalEmail("zain-bahrain")}\` / \`Password123!\``,
    "",
    `## Partner files (${reports.length})`,
    "",
  ];

  for (const report of reports) {
    const slug = slugForPartnerName(report.partner.name);
    if (!slug) {
      throw new Error(`No seed slug for partner ${report.partner.name}`);
    }

    const byService = new Map<string, { service: string; local: number }>();
    for (const line of report.lineItems) {
      const service = line.description?.trim() || "Unknown";
      const key = normService(service);
      const local = Number(line.amount);
      if (!Number.isFinite(local)) continue;
      const existing = byService.get(key);
      if (existing) {
        existing.local += local;
      } else {
        byService.set(key, { service, local });
      }
    }

    const services = [...byService.values()].sort((a, b) =>
      a.service.localeCompare(b.service),
    );

    const filename = `partner-${slug}-zain-bahrain-aug26.xlsx`;
    const out = new ExcelJS.Workbook();
    const sheet = out.addWorksheet("Report");
    sheet.addRow(["OpCo Name", "Service Name", "Gross Amount"]);
    sheet.getRow(1).font = { bold: true };

    let totalUsd = 0;
    for (const row of services) {
      const usd = Number((row.local * fx.rateToUsd).toFixed(4));
      totalUsd += usd;
      sheet.addRow([opco.name, row.service, usd]);
    }
    sheet.columns = [{ width: 18 }, { width: 40 }, { width: 16 }];

    await writeFile(
      path.join(OUT_DIR, filename),
      Buffer.from(await out.xlsx.writeBuffer()),
    );

    notes.push(
      `- \`${filename}\` — \`${portalEmail(slug)}\` / \`Password123!\` — ${services.length} service(s), USD ${totalUsd.toFixed(4)}`,
    );
    console.log(
      `${slug}: ${services.length} services from ${report.lineItems.length} OpCo lines`,
    );
  }

  notes.push(
    "",
    "Revenue Share unlocks when every Partner in the OpCo upload also has a Partner report for the same period.",
    "",
  );
  await writeFile(path.join(OUT_DIR, "README.md"), `${notes.join("\n")}\n`);
  console.log(`wrote ${reports.length} files to ${OUT_DIR}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

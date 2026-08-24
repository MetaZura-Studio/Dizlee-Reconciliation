/**
 * Remaining Zain KSA Partner samples from the live OpCo upload (Aug 2026).
 * Skips MobileArts (already generated). Partner Gross amount is USD (OpCo SAR × rate).
 */
import ExcelJS from "exceljs";
import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { PrismaClient } from "@prisma/client";

import { portalEmail } from "../prisma/seed-data/helpers";
import { PARTNER_SEEDS } from "../prisma/seed-data/partners";
import { getOpcoReportFx } from "../lib/platform/report-fx";

const prisma = new PrismaClient();
const OUT_DIR = path.join(
  process.cwd(),
  "Reports",
  "Partner Reports- Samples",
  "zain-ksa",
);
const SKIP_PARTNERS = new Set(["mobilearts"]);

async function main() {
  const opco = await prisma.opco.findFirst({
    where: { name: "Zain KSA", isDeleted: false },
    select: { id: true },
  });
  if (!opco) {
    throw new Error("Zain KSA not found");
  }

  const month = 8;
  const year = 2026;
  const fx = await getOpcoReportFx({ opcoId: opco.id, month, year });
  if (fx.rateToUsd == null) {
    throw new Error("No USD rate for Zain KSA August 2026 — set Admin monthly rates.");
  }

  const reports = await prisma.report.findMany({
    where: {
      opcoId: opco.id,
      month,
      year,
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

  await mkdir(OUT_DIR, { recursive: true });

  const notes: string[] = [
    "# Zain KSA remaining Partner samples",
    "",
    "Period on the uploaded OpCo report: **August 2026** (source file was Apr26).",
    `USD rate used: **${fx.rateToUsd}** (${fx.currencyCode} → USD).`,
    "Partner **Gross amount (LC)** is USD so it matches recon (OpCo SAR × rate).",
    "Upload each file as that Partner for **Zain KSA / August 2026**.",
    "",
    "## Already done",
    "- `partner-mobilearts-zain-ksa-apr26.xlsx` — `mobilearts@dizlee.com`",
    "",
    "## Remaining (needed for Revenue Share)",
    "",
  ];

  for (const report of reports) {
    const seed = PARTNER_SEEDS.find(
      (item) => item.name.toLowerCase() === report.partner.name.toLowerCase(),
    );
    if (!seed) {
      throw new Error(`No seed slug for partner ${report.partner.name}`);
    }
    if (SKIP_PARTNERS.has(seed.slug)) {
      continue;
    }

    const filename = `partner-${seed.slug}-zain-ksa-aug26.xlsx`;
    const out = new ExcelJS.Workbook();
    const sheet = out.addWorksheet("Report");
    sheet.addRow([
      "Merchant",
      "Service name",
      "Application name",
      "SC",
      "Gross amount (LC)",
    ]);
    sheet.getRow(1).font = { bold: true };

    for (const line of report.lineItems) {
      const local = Number(line.amount);
      const usd = Number((local * fx.rateToUsd).toFixed(4));
      const service = line.description?.trim() || "Unknown";
      sheet.addRow([report.partner.name, service, service, "", usd]);
    }
    sheet.columns = [
      { width: 18 },
      { width: 22 },
      { width: 22 },
      { width: 10 },
      { width: 18 },
    ];

    await writeFile(
      path.join(OUT_DIR, filename),
      Buffer.from(await out.xlsx.writeBuffer()),
    );

    notes.push(
      `- \`${filename}\` — \`${portalEmail(seed.slug)}\` / \`Password123!\` — ${report.lineItems.length} service(s)`,
    );
    console.log(`${seed.slug}: ${report.lineItems.length} lines`);
  }

  notes.push(
    "",
    "Revenue Share unlocks when every Partner in the OpCo upload also has a Partner report for the same period.",
    "",
  );
  await writeFile(path.join(OUT_DIR, "README.md"), `${notes.join("\n")}\n`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

/**
 * Partner sample files from the Zain Bahrain marked workbook, using the
 * Admin-saved report map and live OpCo–Partner links.
 */
import { readFile, mkdir, readdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import ExcelJS from "exceljs";

import { parseStoredSampleHeaders } from "../lib/admin/opco-report-mapping-excel";
import {
  assertOpcoMappingReady,
  parseOpcoReportWithMapping,
} from "../lib/opco/excel/parse-mapped-opco-report";
import { matchLinkedPartner } from "../lib/platform/service-partner-map";

const SOURCE = path.join(
  process.cwd(),
  "Reports",
  "Opco Reports- Marked",
  "Zain Bahrain-Apr26.xlsx",
);
const OUT_DIR = path.join(
  process.cwd(),
  "Reports",
  "Partner Reports- Samples",
  "zain-bahrain",
);

const prisma = new PrismaClient();

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

type Line = { service: string; amount: number };

async function main() {
  const opco = await prisma.opco.findFirst({
    where: { name: "Zain Bahrain", isDeleted: false },
    select: { id: true, name: true },
  });
  if (!opco) {
    throw new Error("Zain Bahrain OpCo not found in the database");
  }

  const mapping = await prisma.opcoReportMapping.findFirst({
    where: { opcoId: opco.id, isDeleted: false },
  });
  if (!mapping) {
    throw new Error("Zain Bahrain report mapping is not configured");
  }

  const storedSheet = parseStoredSampleHeaders(mapping.headersJson).sheetName;
  const preferredSheetName = "Raw Data";
  const usesRawHeaders =
    (mapping.partnerColumn ?? "").toUpperCase() === "PROVIDER" ||
    storedSheet?.trim().toLowerCase() === "raw data";
  const config = assertOpcoMappingReady({
    serviceColumn: usesRawHeaders ? mapping.serviceColumn : "SERVICE_NAME",
    partnerMode: "EXCEL_COLUMN",
    partnerColumn: usesRawHeaders ? mapping.partnerColumn : "PROVIDER",
    revenueColumn: usesRawHeaders ? mapping.revenueColumn : "GROSS_REVENUE",
    revenueShareColumn: usesRawHeaders ? mapping.revenueShareColumn : null,
    rowFilterColumn: usesRawHeaders ? mapping.rowFilterColumn : "INTEGRATION_VIA",
    rowFilterValue: usesRawHeaders ? mapping.rowFilterValue : "Group API",
    aggregateDailyRows: false,
    preferredSheetName,
  });

  const links = await prisma.opcoPartnerLink.findMany({
    where: {
      opcoId: opco.id,
      isDeleted: false,
      partner: { isDeleted: false },
    },
    include: {
      partner: {
        include: {
          users: {
            where: { isDeleted: false },
            select: { email: true },
            take: 1,
          },
        },
      },
    },
  });

  const linked = links.map((link) => {
    const email = link.partner.users[0]?.email ?? null;
    const slug = email?.endsWith("@dizlee.com")
      ? email.slice(0, -"@dizlee.com".length)
      : slugify(link.partner.name);
    return {
      id: link.partner.id,
      name: link.partner.name,
      email,
      slug,
    };
  });

  const buffer = await readFile(SOURCE);
  const parsed = await parseOpcoReportWithMapping(buffer, config);
  if (parsed.partnerMode !== "EXCEL_COLUMN") {
    throw new Error(
      `Bahrain Partner pack expects Excel-column Partner mode, got ${parsed.partnerMode}`,
    );
  }

  const byId = new Map<string, Line[]>();
  const unmatched = new Map<string, number>();

  for (const line of parsed.partnerColumnLines) {
    const matched = matchLinkedPartner(line.partnerName, linked);
    if (!matched) {
      unmatched.set(line.partnerName, (unmatched.get(line.partnerName) ?? 0) + 1);
      continue;
    }
    if (line.amount === null) continue;
    const key = matched.id.toString();
    const list = byId.get(key) ?? [];
    list.push({ service: line.serviceName, amount: line.amount });
    byId.set(key, list);
  }

  await mkdir(OUT_DIR, { recursive: true });
  for (const file of await readdir(OUT_DIR)) {
    if (file.endsWith(".xlsx") || file === "README.md") {
      await unlink(path.join(OUT_DIR, file));
    }
  }

  const withRows = linked
    .filter((partner) => byId.has(partner.id.toString()))
    .sort((a, b) => a.name.localeCompare(b.name));

  const notes: string[] = [
    "# Zain Bahrain Partner samples (live Admin mapping + links)",
    "",
    "OpCo upload the **original** file:",
    "`Reports/Opco Reports- Marked/Zain Bahrain-Apr26.xlsx`",
    "Sheet: **Raw Data** (not Summary).",
    config.rowFilterColumn && config.rowFilterValue
      ? `Row filter: **${config.rowFilterColumn}** = **${config.rowFilterValue}**.`
      : "No row filter.",
    `Columns: Partner \`${config.partnerColumn ?? "—"}\`, Service \`${config.serviceColumn}\`, Revenue \`${config.revenueColumn}\`.`,
    "Each Partner file keeps **daily Raw Data rows** (not Summary totals).",
    "",
    "## OpCo",
    "- Login: `zain-bahrain@dizlee.com` / `Password123!`",
    "- Period: **April 2026**",
    "",
    `## Linked Partners with rows (${withRows.length} of ${linked.length})`,
    "",
  ];

  for (const partner of withRows) {
    const rawLines = byId.get(partner.id.toString()) ?? [];
    const services = new Set(rawLines.map((line) => line.service)).size;
    const filename = `partner-${partner.slug}-zain-bahrain-apr26.xlsx`;
    const out = new ExcelJS.Workbook();
    const report = out.addWorksheet("Report");
    report.addRow(["OpCo Name", "Service Name", "Gross Amount"]);
    report.getRow(1).font = { bold: true };
    for (const line of rawLines) {
      report.addRow(["Zain Bahrain", line.service, Number(line.amount.toFixed(4))]);
    }
    report.columns = [{ width: 22 }, { width: 48 }, { width: 16 }];
    await writeFile(
      path.join(OUT_DIR, filename),
      Buffer.from(await out.xlsx.writeBuffer()),
    );
    const total = rawLines.reduce((sum, line) => sum + line.amount, 0);
    const login = partner.email ?? "(no portal user)";
    notes.push(
      `- \`${filename}\` — \`${login}\` — ${rawLines.length} raw rows, ${services} services, gross ${total.toFixed(2)}`,
    );
    console.log(`${partner.name}: ${rawLines.length} raw rows, ${services} services`);
  }

  const withoutRows = linked.filter((partner) => !byId.has(partner.id.toString()));
  if (withoutRows.length > 0) {
    notes.push("", "## Linked Partners with no matching rows", "");
    for (const partner of withoutRows.sort((a, b) => a.name.localeCompare(b.name))) {
      notes.push(`- ${partner.name}`);
    }
  }

  if (unmatched.size > 0) {
    notes.push("", "## Filtered merchants that are not linked", "");
    for (const [name, count] of [...unmatched.entries()].sort()) {
      notes.push(`- \`${name}\` — ${count} rows`);
    }
  }

  notes.push(
    "",
    "## Reconcile then Revenue Share",
    "Reconcile each Partner above. Revenue Share unlocks when every Partner **present in the OpCo upload** has also uploaded.",
    "",
  );
  await writeFile(path.join(OUT_DIR, "README.md"), `${notes.join("\n")}\n`);
  console.log(`Parsed lines: ${parsed.partnerColumnLines.length}`);
  console.log(`Linked partners: ${linked.length}`);
  console.log(`Files written: ${withRows.length}`);
  console.log(`Unmatched merchants: ${unmatched.size}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

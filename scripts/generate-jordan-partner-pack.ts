/**
 * Partner sample files for Zain Jordan (April 2026).
 * Uses Desktop OpCo workbook + live OpCo–Partner links.
 * Linked partners with no OpCo services get a placeholder "-" row.
 */
import { mkdir, readdir, unlink, writeFile } from "node:fs/promises";
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
  "/Users/hussnainnawaz/Desktop/OpCo Reports-Apr26",
  "Zain Jordan-Apr26.xlsx",
);
const OUT_DIR = path.join(
  process.cwd(),
  "Reports",
  "Partner Reports- Samples",
  "zain-jordan",
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

type AmountScenario = "match" | "near" | "mismatch";

const NEAR_FACTOR = 1.015;
const MISMATCH_FACTOR = 1.06;

function aggregateByService(lines: Line[]): Line[] {
  const totals = new Map<string, number>();
  for (const line of lines) {
    const key = line.service.trim();
    if (!key) continue;
    totals.set(key, (totals.get(key) ?? 0) + line.amount);
  }
  return [...totals.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([service, amount]) => ({ service, amount }));
}

function scenarioForService(
  partnerSlug: string,
  serviceIndex: number,
  serviceCount: number,
): AmountScenario {
  if (partnerSlug === "digitalvirgo" && serviceIndex === 0) {
    return "mismatch";
  }
  if (partnerSlug === "digitalvirgo" && serviceIndex === 1) {
    return "near";
  }
  if (partnerSlug === "arpuplus" && serviceIndex === 0) {
    return "near";
  }
  if (serviceCount > 2 && serviceIndex === serviceCount - 1) {
    return "mismatch";
  }
  return "match";
}

function applyScenario(amount: number, scenario: AmountScenario): number {
  if (scenario === "near") return amount * NEAR_FACTOR;
  if (scenario === "mismatch") return amount * MISMATCH_FACTOR;
  return amount;
}

async function main() {
  const opco = await prisma.opco.findFirst({
    where: { name: "Zain Jordan", isDeleted: false },
    select: { id: true, name: true },
  });
  if (!opco) {
    throw new Error("Zain Jordan OpCo not found in the database");
  }

  const mapping = await prisma.opcoReportMapping.findFirst({
    where: { opcoId: opco.id, isDeleted: false },
  });
  if (!mapping) {
    throw new Error("Zain Jordan report mapping is not configured");
  }

  const preferredSheetName =
    parseStoredSampleHeaders(mapping.headersJson).sheetName ?? "Sheet1";

  const config = assertOpcoMappingReady({
    serviceColumn: mapping.serviceColumn,
    partnerMode: "EXCEL_COLUMN",
    partnerColumn: mapping.partnerColumn,
    revenueColumn: mapping.revenueColumn,
    revenueShareColumn: mapping.revenueShareColumn,
    rowFilterColumn: mapping.rowFilterColumn,
    rowFilterValue: mapping.rowFilterValue,
    aggregateDailyRows: mapping.aggregateDailyRows,
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

  const buffer = await (await import("node:fs/promises")).readFile(SOURCE);
  const parsed = await parseOpcoReportWithMapping(buffer, config);
  if (parsed.partnerMode !== "EXCEL_COLUMN") {
    throw new Error(
      `Jordan Partner pack expects Excel-column Partner mode, got ${parsed.partnerMode}`,
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

  const sortedLinked = [...linked].sort((a, b) => a.name.localeCompare(b.name));
  const withRows = sortedLinked.filter((partner) => byId.has(partner.id.toString()));
  const withoutRows = sortedLinked.filter((partner) => !byId.has(partner.id.toString()));

  const notes: string[] = [
    "# Zain Jordan Partner samples (live Admin mapping + links)",
    "",
    "OpCo upload the **original** file:",
    "`/Users/hussnainnawaz/Desktop/OpCo Reports-Apr26/Zain Jordan-Apr26.xlsx`",
    `Sheet: **${preferredSheetName}**.`,
    config.rowFilterColumn && config.rowFilterValue
      ? `Row filter: **${config.rowFilterColumn}** = **${config.rowFilterValue}**.`
      : "No row filter.",
    `Columns: Partner \`${config.partnerColumn ?? "—"}\`, Service \`${config.serviceColumn}\`, Revenue \`${config.revenueColumn}\`.`,
    "Each Partner file is **one row per service** (gross summed).",
    "Columns: **OpCo Name**, **Service Name**, **Gross Amount**.",
    "",
    "Linked partners with **no services** in the OpCo file still get a file with a single `-` placeholder row.",
    "",
    "Amount mix vs OpCo totals (tolerance 2.5%):",
    "- **match** — same gross (most services)",
    "- **near** — Partner = OpCo × 1.015 (still MATCHED)",
    "- **mismatch** — Partner = OpCo × 1.06 (MISMATCHED)",
    "",
    "## OpCo",
    "- Login: `zain-jordan@dizlee.com` / `Password123!`",
    "- Period: **April 2026**",
    "",
    `## Partner files (${sortedLinked.length} linked)`,
    "",
  ];

  const scenarioNotes: string[] = ["", "## Amount scenarios / placeholders", ""];

  for (const partner of sortedLinked) {
    const rawLines = byId.get(partner.id.toString()) ?? [];
    const aggregated = aggregateByService(rawLines);
    const filename = `partner-${partner.slug}-zain-jordan-apr26.xlsx`;
    const out = new ExcelJS.Workbook();
    const report = out.addWorksheet("Report");
    report.addRow(["OpCo Name", "Service Name", "Gross Amount"]);
    report.getRow(1).font = { bold: true };

    const login = partner.email ?? "(no portal user)";

    if (aggregated.length === 0) {
      report.addRow(["Zain Jordan", "-", "-"]);
      report.columns = [{ width: 22 }, { width: 48 }, { width: 16 }];
      await writeFile(
        path.join(OUT_DIR, filename),
        Buffer.from(await out.xlsx.writeBuffer()),
      );
      notes.push(
        `- \`${filename}\` — \`${login}\` — **no services** (placeholder \`-\`)`,
      );
      scenarioNotes.push(`- **${partner.name}**: no OpCo services → Service Name \`-\``);
      console.log(`${partner.name}: no services (placeholder -)`);
      continue;
    }

    let partnerGross = 0;
    const partnerScenarios: string[] = [];
    aggregated.forEach((line, index) => {
      const scenario = scenarioForService(partner.slug, index, aggregated.length);
      const gross = Number(applyScenario(line.amount, scenario).toFixed(4));
      partnerGross += gross;
      report.addRow(["Zain Jordan", line.service, gross]);
      if (scenario !== "match") {
        partnerScenarios.push(`${line.service} → ${scenario}`);
      }
    });

    report.columns = [{ width: 22 }, { width: 48 }, { width: 16 }];
    await writeFile(
      path.join(OUT_DIR, filename),
      Buffer.from(await out.xlsx.writeBuffer()),
    );
    notes.push(
      `- \`${filename}\` — \`${login}\` — ${aggregated.length} services, partner gross ${partnerGross.toFixed(2)}`,
    );
    if (partnerScenarios.length > 0) {
      scenarioNotes.push(`- **${partner.name}**: ${partnerScenarios.join("; ")}`);
    } else {
      scenarioNotes.push(`- **${partner.name}**: all services match`);
    }
    console.log(
      `${partner.name}: ${aggregated.length} services, gross ${partnerGross.toFixed(2)}`,
    );
  }

  notes.push(...scenarioNotes);

  notes.push(
    "",
    `## Summary`,
    `- Linked partners with services: **${withRows.length}**`,
    `- Linked partners with no services (placeholder \`-\`): **${withoutRows.length}**`,
  );
  if (withoutRows.length > 0) {
    for (const partner of withoutRows) {
      notes.push(`  - ${partner.name}`);
    }
  }

  if (unmatched.size > 0) {
    notes.push("", "## Merchants in OpCo file that are not linked", "");
    for (const [name, count] of [...unmatched.entries()].sort()) {
      notes.push(`- \`${name}\` — ${count} rows`);
    }
  }

  notes.push(
    "",
    "## Reconcile then Revenue Share",
    "Upload OpCo file first, then upload Partner files that have real services.",
    "Placeholder `-` files are for awareness only — do not upload them for reconcile (those partners have no OpCo side).",
    "Revenue Share unlocks when every Partner **present in the OpCo upload** has also uploaded.",
    "",
  );
  await writeFile(path.join(OUT_DIR, "README.md"), `${notes.join("\n")}\n`);
  console.log(`Parsed lines: ${parsed.partnerColumnLines.length}`);
  console.log(`Linked partners: ${linked.length}`);
  console.log(`With services: ${withRows.length}`);
  console.log(`No services (placeholder): ${withoutRows.length}`);
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

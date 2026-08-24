/**
 * Partner sample files from the Zain Bahrain marked workbook, using the
 * Admin-saved report map and live OpCo–Partner links.
 */
import { readFile, mkdir, readdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import ExcelJS from "exceljs";

import { hashPassword } from "../lib/auth/password";
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

type AmountScenario = "match" | "near" | "mismatch";

/** Seed tolerance is 2.5%. Near stays inside it; mismatch is clearly outside. */
const NEAR_FACTOR = 1.015;
const MISMATCH_FACTOR = 1.06;

function aggregateByService(lines: Line[]): Line[] {
  const totals = new Map<string, number>();
  for (const line of lines) {
    const key = line.service.trim();
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
  if (partnerSlug === "tangerine" && serviceCount > 0 && serviceIndex === serviceCount - 1) {
    return "mismatch";
  }
  if (partnerSlug === "tangerine" && serviceIndex === 1) {
    return "near";
  }
  if (partnerSlug === "gamemine" && serviceIndex === 0) {
    return "near";
  }
  return "match";
}

function applyScenario(amount: number, scenario: AmountScenario): number {
  if (scenario === "near") {
    return amount * NEAR_FACTOR;
  }
  if (scenario === "mismatch") {
    return amount * MISMATCH_FACTOR;
  }
  return amount;
}

type PackPartner = {
  id: bigint;
  name: string;
  email: string | null;
  slug: string;
};

function packPartnerFromRow(partner: {
  id: bigint;
  name: string;
  users: { email: string }[];
}): PackPartner {
  const email = partner.users[0]?.email ?? null;
  const slug = email?.endsWith("@dizlee.com")
    ? email.slice(0, -"@dizlee.com".length)
    : slugify(partner.name);
  return { id: partner.id, name: partner.name, email, slug };
}

function displayForUnmatchedExcelName(excelName: string): {
  name: string;
  slug: string;
} {
  const key = slugify(excelName);
  const known: Record<string, { name: string; slug: string }> = {
    centili: { name: "Centili", slug: "centili" },
    docomo: { name: "Docomo Digital", slug: "docomo-digital" },
    karti: { name: "Karti", slug: "karti" },
    shofha: { name: "Shofha", slug: "shofha" },
  };
  return known[key] ?? { name: excelName.trim(), slug: key || "partner" };
}

function pushLine(byId: Map<string, Line[]>, partnerId: bigint, line: Line) {
  const key = partnerId.toString();
  const list = byId.get(key) ?? [];
  list.push(line);
  byId.set(key, list);
}

async function writePartnerSample(
  partner: PackPartner,
  rawLines: Line[],
): Promise<{ filename: string; partnerGross: number; scenarios: string[] }> {
  const aggregated = aggregateByService(rawLines);
  const filename = `partner-${partner.slug}-zain-bahrain-apr26.xlsx`;
  const out = new ExcelJS.Workbook();
  const report = out.addWorksheet("Report");
  report.addRow(["OpCo Name", "Service Name", "Gross Amount"]);
  report.getRow(1).font = { bold: true };

  let partnerGross = 0;
  const scenarios: string[] = [];
  aggregated.forEach((line, index) => {
    const scenario = scenarioForService(partner.slug, index, aggregated.length);
    const gross = Number(applyScenario(line.amount, scenario).toFixed(4));
    partnerGross += gross;
    report.addRow(["Zain Bahrain", line.service, gross]);
    if (scenario !== "match") {
      scenarios.push(`${line.service} → ${scenario}`);
    }
  });

  report.columns = [{ width: 22 }, { width: 48 }, { width: 16 }];
  await writeFile(
    path.join(OUT_DIR, filename),
    Buffer.from(await out.xlsx.writeBuffer()),
  );
  return { filename, partnerGross, scenarios };
}

async function ensurePartnerWithUser(params: {
  name: string;
  slug: string;
}): Promise<PackPartner> {
  const existing = await prisma.partner.findFirst({
    where: { name: params.name, isDeleted: false },
    include: {
      users: {
        where: { isDeleted: false },
        select: { email: true },
        take: 1,
      },
    },
  });
  if (existing) {
    return packPartnerFromRow(existing);
  }

  const [activeStatus, partnerRole] = await Promise.all([
    prisma.lookup.findFirst({
      where: { code: "ACTIVE", lookupType: { code: "USER_STATUS" } },
      select: { id: true },
    }),
    prisma.lookup.findFirst({
      where: { code: "PARTNER", lookupType: { code: "USER_ROLE" } },
      select: { id: true },
    }),
  ]);
  if (!activeStatus || !partnerRole) {
    throw new Error("ACTIVE status or PARTNER role lookup is missing");
  }

  const created = await prisma.partner.create({
    data: {
      name: params.name,
      statusId: activeStatus.id,
    },
  });
  const email = `${params.slug}@dizlee.com`;
  const passwordHash = await hashPassword("Password123!");
  await prisma.user.upsert({
    where: { email },
    update: {
      name: params.name,
      roleId: partnerRole.id,
      statusId: activeStatus.id,
      passwordHash,
      partnerId: created.id,
      opcoId: null,
      isDeleted: false,
    },
    create: {
      email,
      name: params.name,
      roleId: partnerRole.id,
      statusId: activeStatus.id,
      passwordHash,
      partnerId: created.id,
    },
  });
  console.log(
    `Created partner ${params.name} (${email}) so you can link it in Admin`,
  );
  return {
    id: created.id,
    name: params.name,
    email,
    slug: params.slug,
  };
}

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

  const linked = links.map((link) => packPartnerFromRow(link.partner));
  const linkedIds = new Set(linked.map((partner) => partner.id.toString()));

  const allPartnerRows = await prisma.partner.findMany({
    where: { isDeleted: false },
    include: {
      users: {
        where: { isDeleted: false },
        select: { email: true },
        take: 1,
      },
    },
  });
  const allPartners = allPartnerRows.map(packPartnerFromRow);

  const buffer = await readFile(SOURCE);
  const parsed = await parseOpcoReportWithMapping(buffer, config);
  if (parsed.partnerMode !== "EXCEL_COLUMN") {
    throw new Error(
      `Bahrain Partner pack expects Excel-column Partner mode, got ${parsed.partnerMode}`,
    );
  }

  const byId = new Map<string, Line[]>();
  const unmatchedLines = new Map<string, Line[]>();
  const unmatchedCounts = new Map<string, number>();

  for (const line of parsed.partnerColumnLines) {
    const matched = matchLinkedPartner(line.partnerName, linked);
    if (matched) {
      if (line.amount === null) continue;
      pushLine(byId, matched.id, {
        service: line.serviceName,
        amount: line.amount,
      });
      continue;
    }
    unmatchedCounts.set(
      line.partnerName,
      (unmatchedCounts.get(line.partnerName) ?? 0) + 1,
    );
    if (line.amount === null) continue;
    const pending = unmatchedLines.get(line.partnerName) ?? [];
    pending.push({ service: line.serviceName, amount: line.amount });
    unmatchedLines.set(line.partnerName, pending);
  }

  const toLinkById = new Map<string, PackPartner>();
  for (const [excelName, lines] of unmatchedLines) {
    const known = matchLinkedPartner(excelName, allPartners);
    if (known) {
      for (const line of lines) {
        pushLine(byId, known.id, line);
      }
      if (!linkedIds.has(known.id.toString())) {
        toLinkById.set(known.id.toString(), known);
      }
      unmatchedCounts.delete(excelName);
      continue;
    }

    const display = displayForUnmatchedExcelName(excelName);
    const created = await ensurePartnerWithUser(display);
    allPartners.push(created);
    for (const line of lines) {
      pushLine(byId, created.id, line);
    }
    toLinkById.set(created.id.toString(), created);
    unmatchedCounts.delete(excelName);
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
  const toLink = [...toLinkById.values()].sort((a, b) =>
    a.name.localeCompare(b.name),
  );

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
    "Each Partner file is **one row per service** (gross summed from Raw Data).",
    "Columns: **OpCo Name**, **Service Name**, **Gross Amount**.",
    "",
    "Amount mix vs OpCo totals (tolerance 2.5%):",
    "- **match** — same gross (most services)",
    "- **near** — Partner = OpCo × 1.015 (still MATCHED)",
    "- **mismatch** — Partner = OpCo × 1.06 (MISMATCHED)",
    "",
    "## OpCo",
    "- Login: `zain-bahrain@dizlee.com` / `Password123!`",
    "- Period: **April 2026**",
    "- File: `Reports/Opco Reports- Marked/Zain Bahrain-Apr26.xlsx`",
    "",
    `## Linked Partners with rows (${withRows.length} of ${linked.length})`,
    "",
  ];

  const scenarioNotes: string[] = ["", "## Amount scenarios (for reconcile testing)", ""];

  async function appendPartnerNotes(partner: PackPartner) {
    const rawLines = byId.get(partner.id.toString()) ?? [];
    const written = await writePartnerSample(partner, rawLines);
    const login = partner.email ?? "(no portal user)";
    const serviceCount = aggregateByService(rawLines).length;
    notes.push(
      `- \`${written.filename}\` — \`${login}\` — ${serviceCount} services, partner gross ${written.partnerGross.toFixed(2)}`,
    );
    if (written.scenarios.length > 0) {
      scenarioNotes.push(`- **${partner.name}**: ${written.scenarios.join("; ")}`);
    } else {
      scenarioNotes.push(`- **${partner.name}**: all services match`);
    }
    console.log(
      `${partner.name}: ${serviceCount} services, gross ${written.partnerGross.toFixed(2)}`,
    );
  }

  for (const partner of withRows) {
    await appendPartnerNotes(partner);
  }

  if (toLink.length > 0) {
    notes.push(
      "",
      "## In the OpCo file — link in Admin, then upload",
      "",
      "These merchants are in `Zain Bahrain-Apr26.xlsx` but not linked yet. Tick them on Admin → OpCo partners for Zain Bahrain, then OpCo upload will save. Partner logins use `Password123!`.",
      "",
    );
    for (const partner of toLink) {
      await appendPartnerNotes(partner);
    }
  }

  notes.push(...scenarioNotes);

  const withoutRows = linked.filter((partner) => !byId.has(partner.id.toString()));
  if (withoutRows.length > 0) {
    notes.push("", "## Linked Partners with no matching rows", "");
    for (const partner of withoutRows.sort((a, b) => a.name.localeCompare(b.name))) {
      notes.push(`- ${partner.name}`);
    }
  }

  if (unmatchedCounts.size > 0) {
    notes.push("", "## Filtered merchants that are not linked", "");
    for (const [name, count] of [...unmatchedCounts.entries()].sort()) {
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
  console.log(`Files written: ${withRows.length + toLink.length}`);
  console.log(`To link in Admin: ${toLink.map((partner) => partner.name).join(", ") || "none"}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

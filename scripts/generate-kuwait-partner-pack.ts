/**
 * Partner sample files from the real Zain Kuwait marked workbook
 * (Dizlee Rev 3% - Detailed). Does not rewrite the OpCo file.
 */
import ExcelJS from "exceljs";
import path from "node:path";
import { mkdir, readdir, unlink, writeFile } from "node:fs/promises";

import { OPCO_PARTNER_LINK_SEEDS } from "../prisma/seed-data/opco-partner-links";
import { PARTNER_SEEDS } from "../prisma/seed-data/partners";
import { portalEmail } from "../prisma/seed-data/helpers";
import { matchLinkedPartner } from "../lib/platform/service-partner-map";

const SOURCE = path.join(
  process.cwd(),
  "Reports",
  "Opco Reports- Marked",
  "Zain Kuwait-Apr26.xlsx",
);
const OUT_DIR = path.join(
  process.cwd(),
  "Reports",
  "Partner Reports- Samples",
  "zain-kuwait",
);

function cellText(value: ExcelJS.CellValue): string {
  if (value == null) return "";
  if (typeof value === "object" && "text" in value) return String(value.text ?? "").trim();
  if (typeof value === "object" && "result" in value) {
    return String(value.result ?? "").trim();
  }
  return String(value).trim();
}

function norm(value: string): string {
  return value.toLowerCase().replace(/\r?\n/g, " ").replace(/\s+/g, " ").trim();
}

function parseAmount(value: ExcelJS.CellValue): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const text = cellText(value).replace(/,/g, "").trim();
  if (!text || text === "-") return null;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
}

type Line = { service: string; amount: number; share: number | null };

function aggregate(lines: Line[]): Line[] {
  const map = new Map<string, Line>();
  for (const line of lines) {
    const key = norm(line.service);
    const existing = map.get(key);
    if (existing) {
      existing.amount += line.amount;
    } else {
      map.set(key, { ...line });
    }
  }
  return [...map.values()].sort((a, b) => a.service.localeCompare(b.service));
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  for (const file of await readdir(OUT_DIR)) {
    if (file.endsWith(".xlsx") || file === "README.md") {
      await unlink(path.join(OUT_DIR, file));
    }
  }

  const linkedSlugs = OPCO_PARTNER_LINK_SEEDS.filter(
    (link) => link.opcoSlug === "zain-kuwait",
  ).map((link) => link.partnerSlug);
  const linked = PARTNER_SEEDS.filter((partner) => linkedSlugs.includes(partner.slug));

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(SOURCE);
  const sheet = workbook.worksheets.find(
    (item) => item.name.trim().toLowerCase() === "dizlee rev 3% - detailed",
  );
  if (!sheet) {
    throw new Error("Dizlee Rev 3% - Detailed sheet not found");
  }

  let headerRow = 0;
  let partnerCol = 0;
  let serviceCol = 0;
  let amountCol = 0;
  let shareCol = 0;
  for (let rowNumber = 1; rowNumber <= 5; rowNumber += 1) {
    sheet.getRow(rowNumber).eachCell({ includeEmpty: false }, (cell, col) => {
      const label = norm(cellText(cell.value));
      if (label === "service provider name") partnerCol = col;
      if (label === "service name") serviceCol = col;
      if (label.startsWith("gross revenue (lc)")) amountCol = col;
      if (label === "rs %") shareCol = col;
    });
    if (partnerCol && serviceCol && amountCol) {
      headerRow = rowNumber;
      break;
    }
  }
  if (!headerRow) {
    throw new Error("Kuwait headers not found");
  }

  const bySlug = new Map<string, Line[]>();
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber <= headerRow) return;
    const provider = cellText(row.getCell(partnerCol).value);
    const matched = matchLinkedPartner(provider, linked);
    if (!matched) return;
    const service = cellText(row.getCell(serviceCol).value);
    const amount = parseAmount(row.getCell(amountCol).value);
    if (!service || amount === null) return;
    const share = shareCol ? parseAmount(row.getCell(shareCol).value) : null;
    const list = bySlug.get(matched.slug) ?? [];
    list.push({ service, amount, share });
    bySlug.set(matched.slug, list);
  });

  const notes: string[] = [
    "# Zain Kuwait Partner samples (from the real OpCo file)",
    "",
    "OpCo upload the **original** file:",
    "`Reports/Opco Reports- Marked/Zain Kuwait-Apr26.xlsx`",
    "Sheet used by the app: **Dizlee Rev 3% - Detailed** (RS % is mapped).",
    "Rows whose Partner label does not match a linked Partner are skipped.",
    "",
    "## OpCo",
    `- Login: \`${portalEmail("zain-kuwait")}\` / \`Password123!\``,
    "- Period: **April 2026**",
    "",
    "## Partner files (only Partners found in that sheet)",
    "",
  ];

  for (const slug of [...bySlug.keys()].sort()) {
    const partner = linked.find((item) => item.slug === slug);
    if (!partner) continue;
    const lines = aggregate(bySlug.get(slug) ?? []);
    const filename = `partner-${slug}-zain-kuwait-apr26.xlsx`;
    const out = new ExcelJS.Workbook();
    const report = out.addWorksheet("Report");
    report.addRow(["OpCo Name", "Service Name", "Gross Amount"]);
    report.getRow(1).font = { bold: true };
    for (const line of lines) {
      report.addRow(["Zain Kuwait", line.service, Number(line.amount.toFixed(4))]);
    }
    report.columns = [{ width: 22 }, { width: 48 }, { width: 16 }];
    await writeFile(
      path.join(OUT_DIR, filename),
      Buffer.from(await out.xlsx.writeBuffer()),
    );
    notes.push(
      `- \`${filename}\` — \`${portalEmail(slug)}\` — ${lines.length} services`,
    );
    console.log(`${slug}: ${lines.length} services`);
  }

  notes.push(
    "",
    "## Reconcile then Revenue Share",
    "Reconcile each Partner above. Revenue Share unlocks when every Partner **present in the OpCo upload** has also uploaded (linked Partners not in the file do not block).",
    "",
  );
  await writeFile(path.join(OUT_DIR, "README.md"), `${notes.join("\n")}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

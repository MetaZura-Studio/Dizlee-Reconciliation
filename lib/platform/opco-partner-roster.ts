/**
 * Excel OpCo–Partner listing: name normalize, spelling aliases, unique pair parse.
 * Used by the replace-links script and seed rebuild.
 */

import ExcelJS from "exceljs";

export function normalizeOrgKey(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function slugifyPartnerName(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return slug.length > 0 ? slug : "partner";
}

/** Excel OpCo label → seed/Admin display name. */
const OPCO_ALIAS_BY_KEY: Record<string, string> = {
  zainksa: "Zain KSA",
};

/** Excel Partner label → existing Admin display name. */
const PARTNER_ALIAS_BY_KEY: Record<string, string> = {
  marvelmedia: "Marvel Media",
  qadishagroup: "Qadisha Group",
  futuratechnologies: "FuturaTechnologies",
  mediaworld: "MediaWorld",
  mobimind: "MobiMind",
  sammedia: "samMedia",
  docomo: "Docomo Digital",
  centili: "Centili",
  karti: "Karti",
  shofha: "Shofha",
  mediadigitalgroupmdg: "MDG",
  blackbox: "Blackbox",
  onmobile: "Onmobile",
  playhera: "PlayHera",
  novustech: "Novustech",
  constantconcept: "ConstantConcept",
  dotconvertecs: "DotConvertecs",
};

export function canonicalOpcoName(excelName: string): string {
  const key = normalizeOrgKey(excelName);
  return OPCO_ALIAS_BY_KEY[key] ?? excelName.trim();
}

export function canonicalPartnerName(
  excelName: string,
  existingNames: Iterable<string>,
): string {
  const key = normalizeOrgKey(excelName);
  if (PARTNER_ALIAS_BY_KEY[key]) {
    return PARTNER_ALIAS_BY_KEY[key];
  }
  for (const existing of existingNames) {
    if (normalizeOrgKey(existing) === key) {
      return existing;
    }
  }
  return excelName.trim();
}

export type RosterPair = {
  opcoName: string;
  partnerName: string;
};

export async function parseOpcoPartnerRosterPairs(
  filePath: string,
  existingPartnerNames: Iterable<string>,
): Promise<RosterPair[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const sheet = workbook.worksheets[0];
  if (!sheet) {
    throw new Error("Excel has no worksheets");
  }

  const seen = new Set<string>();
  const pairs: RosterPair[] = [];

  sheet.eachRow((row, index) => {
    if (index === 1) {
      return;
    }
    const opcoRaw = String(row.getCell(1).value ?? "").trim();
    const partnerRaw = String(row.getCell(2).value ?? "").trim();
    if (!opcoRaw || !partnerRaw) {
      return;
    }

    const opcoName = canonicalOpcoName(opcoRaw);
    const partnerName = canonicalPartnerName(partnerRaw, existingPartnerNames);
    const key = `${normalizeOrgKey(opcoName)}::${normalizeOrgKey(partnerName)}`;
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    pairs.push({ opcoName, partnerName });
  });

  return pairs;
}

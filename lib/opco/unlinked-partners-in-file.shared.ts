/**
 * Shared DTOs for OpCo Excel names that are not linked (or not in master data).
 * Used by upload APIs and the OpCo upload form. No Prisma.
 */

export type UnlinkedPartnersInFile = {
  unlinkedPartnerNames: string[];
  unknownPartnerNames: string[];
};

export function emptyUnlinkedPartnersInFile(): UnlinkedPartnersInFile {
  return { unlinkedPartnerNames: [], unknownPartnerNames: [] };
}

export function hasUnlinkedPartnersInFile(
  result: UnlinkedPartnersInFile,
): boolean {
  return notLinkedPartnerDisplayNames(result).length > 0;
}

/** Partner names to show OpCo — never split “service” vs partner. */
export function notLinkedPartnerDisplayNames(
  result: UnlinkedPartnersInFile,
): string[] {
  const seen = new Set<string>();
  const names: string[] = [];
  for (const raw of [
    ...result.unlinkedPartnerNames,
    ...result.unknownPartnerNames,
  ]) {
    const name = raw.trim();
    if (!name) {
      continue;
    }
    const key = name.toLowerCase().replace(/[^a-z0-9]/g, "") || name.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    names.push(name);
  }
  return names;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

/** Parse 409 payload details from POST /api/opco/reports/upload. */
export function parseUnlinkedPartnersDetails(
  payload: unknown,
): UnlinkedPartnersInFile | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const body = payload as {
    error?: { key?: unknown };
    details?: unknown;
  };
  if (body.error?.key !== "OPCO_UNLINKED_PARTNERS_IN_FILE") {
    return null;
  }
  if (!body.details || typeof body.details !== "object") {
    return null;
  }
  const details = body.details as Record<string, unknown>;
  const result: UnlinkedPartnersInFile = {
    unlinkedPartnerNames: asStringArray(details.unlinkedPartnerNames),
    unknownPartnerNames: asStringArray(details.unknownPartnerNames),
  };
  return hasUnlinkedPartnersInFile(result) ? result : null;
}

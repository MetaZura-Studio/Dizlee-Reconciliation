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

function uniqueDisplayNames(rawNames: string[]): string[] {
  const seen = new Set<string>();
  const names: string[] = [];
  for (const raw of rawNames) {
    const name = raw.trim();
    if (!name) {
      continue;
    }
    const key =
      name.toLowerCase().replace(/[^a-z0-9]/g, "") || name.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    names.push(name);
  }
  return names;
}

/** Partner names to show OpCo — never split “service” vs partner. */
export function notLinkedPartnerDisplayNames(
  result: UnlinkedPartnersInFile,
): string[] {
  return uniqueDisplayNames([
    ...result.unlinkedPartnerNames,
    ...result.unknownPartnerNames,
  ]);
}

/** Names from the unlinked-partner bucket only (OpCo–Partner link missing). */
export function unlinkedPartnerDisplayNames(
  result: UnlinkedPartnersInFile,
): string[] {
  return uniqueDisplayNames(result.unlinkedPartnerNames);
}

/**
 * Names from the unknown bucket only.
 * In SERVICE_PARTNER_MAP mode these are service names missing from the map.
 */
export function unknownPartnerDisplayNames(
  result: UnlinkedPartnersInFile,
): string[] {
  return uniqueDisplayNames(result.unknownPartnerNames);
}

export function defaultLinkRequestMessage(params: {
  partnerFromServiceMap: boolean;
  result: UnlinkedPartnersInFile;
}): string {
  if (!params.partnerFromServiceMap) {
    return "Please add these OpCo–Partner links so we can upload the report.";
  }
  const hasUnknown = unknownPartnerDisplayNames(params.result).length > 0;
  const hasUnlinked = unlinkedPartnerDisplayNames(params.result).length > 0;
  if (hasUnknown && hasUnlinked) {
    return "Please add Service–Partner map rows for the listed services and OpCo–Partner links for the listed partners so we can upload the report.";
  }
  if (hasUnknown) {
    return "Please add these services to the Service–Partner map (link each service to a partner) so we can upload the report.";
  }
  return "Please add these OpCo–Partner links so we can upload the report.";
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

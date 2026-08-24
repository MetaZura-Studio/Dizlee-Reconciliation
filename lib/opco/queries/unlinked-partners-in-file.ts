/**
 * Detect Partner names in an OpCo Excel that are not linked (or not in master data).
 * Used before createReportUpload so unlinked/unknown names never persist.
 */

import type { OpcoPartnerMode } from "@/lib/admin/opco-report-mappings.shared";
import { getLinkedPartnersForOpco } from "@/lib/opco/queries/partners";
import {
  emptyUnlinkedPartnersInFile,
  type UnlinkedPartnersInFile,
} from "@/lib/opco/unlinked-partners-in-file.shared";
import {
  compactPartnerKey,
  matchLinkedPartner,
  matchServiceMapRow,
  normalizeServiceKey,
  type PartnerColumnLine,
  type ResolvedServicePartnerLine,
} from "@/lib/platform/service-partner-map";
import { prisma } from "@/lib/prisma";

export type NamedPartnerRef = {
  id: bigint;
  name: string;
};

function uniqueExcelNames(names: string[]): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const raw of names) {
    const name = raw.trim();
    if (!name) {
      continue;
    }
    const key = normalizeServiceKey(name);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    unique.push(name);
  }
  return unique;
}

function pushUniqueName(target: string[], seen: Set<string>, name: string) {
  const key = normalizeServiceKey(name);
  if (!key || seen.has(key)) {
    return;
  }
  seen.add(key);
  target.push(name);
}

/** Excel Partner-column names vs linked + all active partners. */
export function classifyExcelColumnPartnerNames(params: {
  excelNames: string[];
  linked: NamedPartnerRef[];
  allPartners: NamedPartnerRef[];
}): UnlinkedPartnersInFile {
  const unlinkedPartnerNames: string[] = [];
  const unknownPartnerNames: string[] = [];
  const unlinkedSeen = new Set<string>();
  const unknownSeen = new Set<string>();

  for (const excelName of uniqueExcelNames(params.excelNames)) {
    if (matchLinkedPartner(excelName, params.linked)) {
      continue;
    }
    const known = matchLinkedPartner(excelName, params.allPartners);
    if (known) {
      pushUniqueName(unlinkedPartnerNames, unlinkedSeen, known.name);
    } else {
      pushUniqueName(unknownPartnerNames, unknownSeen, excelName);
    }
  }

  return { unlinkedPartnerNames, unknownPartnerNames };
}

export type ServiceMapLookup = {
  serviceKey: string;
  serviceName?: string | null;
  partnerId: bigint;
  partnerName: string;
  partnerDeleted: boolean;
};

function serviceSeenKey(line: { serviceKey: string; serviceName: string }): string {
  return (
    compactPartnerKey(line.serviceKey) ||
    compactPartnerKey(line.serviceName) ||
    line.serviceKey
  );
}

function isLinkedPartnerId(
  linkedPartnerIds: Set<string>,
  partnerId: bigint,
): boolean {
  return linkedPartnerIds.has(partnerId.toString());
}

/** Service–Partner map rows vs OpCo links. Lists partners, not service names. */
export function classifyServiceMapPartners(params: {
  lines: Array<{ serviceKey: string; serviceName: string }>;
  maps: ServiceMapLookup[];
  linkedPartnerIds: Set<string>;
  allPartners?: NamedPartnerRef[];
}): UnlinkedPartnersInFile {
  const allPartners = params.allPartners ?? [];
  const unlinkedPartnerNames: string[] = [];
  const unknownPartnerNames: string[] = [];
  const unlinkedSeen = new Set<string>();
  const unknownSeen = new Set<string>();
  const seenServices = new Set<string>();

  for (const line of params.lines) {
    const seenKey = serviceSeenKey(line);
    if (seenServices.has(seenKey)) {
      continue;
    }
    seenServices.add(seenKey);

    const mapped = matchServiceMapRow(line, params.maps);
    if (mapped) {
      if (mapped.partnerDeleted) {
        pushUniqueName(unknownPartnerNames, unknownSeen, mapped.partnerName);
        continue;
      }
      if (!isLinkedPartnerId(params.linkedPartnerIds, mapped.partnerId)) {
        pushUniqueName(unlinkedPartnerNames, unlinkedSeen, mapped.partnerName);
      }
      continue;
    }

    const partner = matchLinkedPartner(line.serviceName, allPartners);
    if (partner) {
      if (!isLinkedPartnerId(params.linkedPartnerIds, partner.id)) {
        pushUniqueName(unlinkedPartnerNames, unlinkedSeen, partner.name);
      }
      continue;
    }

    pushUniqueName(
      unknownPartnerNames,
      unknownSeen,
      line.serviceName.trim() || line.serviceKey,
    );
  }

  return { unlinkedPartnerNames, unknownPartnerNames };
}

export async function findUnlinkedPartnersInOpcoFile(params: {
  opcoId: bigint;
  partnerMode: OpcoPartnerMode;
  partnerColumnLines: PartnerColumnLine[];
  serviceMapLines: ResolvedServicePartnerLine[];
}): Promise<UnlinkedPartnersInFile> {
  if (params.partnerMode === "UPLOAD_PICKER") {
    return emptyUnlinkedPartnersInFile();
  }

  const linked = await getLinkedPartnersForOpco(params.opcoId);
  const linkedRefs: NamedPartnerRef[] = linked.map((partner) => ({
    id: BigInt(partner.id),
    name: partner.name,
  }));
  const allPartners = await prisma.partner.findMany({
    where: { isDeleted: false },
    select: { id: true, name: true },
  });

  if (params.partnerMode === "EXCEL_COLUMN") {
    return classifyExcelColumnPartnerNames({
      excelNames: params.partnerColumnLines.map((line) => line.partnerName),
      linked: linkedRefs,
      allPartners,
    });
  }

  const maps = await prisma.servicePartnerMap.findMany({
    where: {
      isDeleted: false,
      opcoId: params.opcoId,
    },
    select: {
      serviceKey: true,
      serviceName: true,
      partnerId: true,
      partner: { select: { name: true, isDeleted: true } },
    },
  });

  return classifyServiceMapPartners({
    lines: params.serviceMapLines.map((line) => ({
      serviceKey: line.serviceKey,
      serviceName: line.serviceName,
    })),
    maps: maps.map((row) => ({
      serviceKey: row.serviceKey,
      serviceName: row.serviceName,
      partnerId: row.partnerId,
      partnerName: row.partner.name,
      partnerDeleted: row.partner.isDeleted,
    })),
    linkedPartnerIds: new Set(linked.map((partner) => partner.id)),
    allPartners,
  });
}

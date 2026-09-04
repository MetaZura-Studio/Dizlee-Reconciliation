/**
 * Admin Service–Partner map CRUD and Excel upsert import.
 */
import {
  writePartnerAuditLog,
  writeServicePartnerMapAuditLog,
} from "@/lib/admin/audit";
import { getLookupId } from "@/lib/admin/lookups";
import {
  parseServicePartnerMapsExcel,
  type ParsedServicePartnerMapRow,
} from "@/lib/admin/service-partner-maps-excel";
import type {
  ServicePartnerMapImportIssue,
  ServicePartnerMapListItem,
} from "@/lib/admin/service-partner-maps.shared";
import {
  createServicePartnerMapSchema,
  updateServicePartnerMapSchema,
  type CreateServicePartnerMapInput,
  type UpdateServicePartnerMapInput,
} from "@/lib/admin/validation/service-partner-maps";
import { DomainError } from "@/lib/errors/app-error";
import {
  matchLinkedPartner,
  normalizeServiceKey,
} from "@/lib/platform/service-partner-map";
import { prisma } from "@/lib/prisma";

export type {
  ServicePartnerMapImportIssue,
  ServicePartnerMapListItem,
} from "@/lib/admin/service-partner-maps.shared";

export class ServicePartnerMapActionError extends DomainError {
  constructor(keyOrMessage: string, status?: number) {
    super("ServicePartnerMapActionError", keyOrMessage, status);
  }
}

function mapRow(row: {
  id: bigint;
  opcoId: bigint;
  serviceName: string;
  serviceKey: string;
  partnerId: bigint;
  opco: { name: string };
  partner: { name: string };
}): ServicePartnerMapListItem {
  return {
    id: row.id.toString(),
    opcoId: row.opcoId.toString(),
    opcoName: row.opco.name,
    serviceName: row.serviceName,
    serviceKey: row.serviceKey,
    partnerId: row.partnerId.toString(),
    partnerName: row.partner.name,
  };
}

const listInclude = {
  opco: { select: { name: true } },
  partner: { select: { name: true } },
} as const;

async function requireActiveOpco(opcoId: bigint): Promise<{ id: bigint; name: string }> {
  const opco = await prisma.opco.findFirst({
    where: {
      id: opcoId,
      isDeleted: false,
      status: { code: "ACTIVE" },
    },
    select: { id: true, name: true },
  });
  if (!opco) {
    throw new ServicePartnerMapActionError("OpCo not found or inactive", 400);
  }
  return opco;
}

async function requireActivePartner(partnerId: bigint): Promise<{ id: bigint; name: string }> {
  const partner = await prisma.partner.findFirst({
    where: {
      id: partnerId,
      isDeleted: false,
      status: { code: "ACTIVE" },
    },
    select: { id: true, name: true },
  });
  if (!partner) {
    throw new ServicePartnerMapActionError("Partner not found or inactive", 400);
  }
  return partner;
}

export async function listServicePartnerMaps(): Promise<ServicePartnerMapListItem[]> {
  const rows = await prisma.servicePartnerMap.findMany({
    where: { isDeleted: false },
    include: listInclude,
    orderBy: [{ opco: { name: "asc" } }, { serviceName: "asc" }],
  });
  return rows.map(mapRow);
}

export async function createServicePartnerMap(
  rawInput: CreateServicePartnerMapInput,
  actorUserId: bigint,
): Promise<ServicePartnerMapListItem> {
  const parsed = createServicePartnerMapSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new ServicePartnerMapActionError(
      parsed.error.issues[0]?.message ?? "Invalid input",
    );
  }

  if (!/^\d+$/.test(parsed.data.partnerId) || !/^\d+$/.test(parsed.data.opcoId)) {
    throw new ServicePartnerMapActionError("Invalid OpCo or Partner id", 400);
  }

  const opcoId = BigInt(parsed.data.opcoId);
  const partnerId = BigInt(parsed.data.partnerId);
  await Promise.all([requireActiveOpco(opcoId), requireActivePartner(partnerId)]);

  const serviceName = parsed.data.serviceName.trim();
  const serviceKey = normalizeServiceKey(serviceName);

  const existing = await prisma.servicePartnerMap.findFirst({
    where: { opcoId, serviceKey, isDeleted: false },
    select: { id: true },
  });
  if (existing) {
    throw new ServicePartnerMapActionError(
      "A mapping already exists for this Service/Application name on this OpCo",
      409,
    );
  }

  const created = await prisma.servicePartnerMap.create({
    data: {
      opcoId,
      serviceName,
      serviceKey,
      partnerId,
      createdByUserId: actorUserId,
      updatedByUserId: actorUserId,
    },
    include: listInclude,
  });

  await writeServicePartnerMapAuditLog({
    actorUserId,
    action: "SERVICE_PARTNER_MAP_CREATED",
    mapId: created.id,
    message: `Service–Partner map created: ${created.serviceName} → ${created.partner.name}`,
    metadata: {
      opcoId: created.opcoId.toString(),
      serviceName: created.serviceName,
      serviceKey: created.serviceKey,
      partnerId: created.partnerId.toString(),
    },
  });

  return mapRow(created);
}

export async function updateServicePartnerMap(
  mapIdRaw: string,
  rawInput: UpdateServicePartnerMapInput,
  actorUserId: bigint,
): Promise<ServicePartnerMapListItem> {
  if (!/^\d+$/.test(mapIdRaw)) {
    throw new ServicePartnerMapActionError("Invalid map id", 400);
  }

  const parsed = updateServicePartnerMapSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new ServicePartnerMapActionError(
      parsed.error.issues[0]?.message ?? "Invalid input",
    );
  }

  if (!/^\d+$/.test(parsed.data.partnerId) || !/^\d+$/.test(parsed.data.opcoId)) {
    throw new ServicePartnerMapActionError("Invalid OpCo or Partner id", 400);
  }

  const mapId = BigInt(mapIdRaw);
  const opcoId = BigInt(parsed.data.opcoId);
  const partnerId = BigInt(parsed.data.partnerId);
  await Promise.all([requireActiveOpco(opcoId), requireActivePartner(partnerId)]);

  const existing = await prisma.servicePartnerMap.findFirst({
    where: { id: mapId, isDeleted: false },
    select: { id: true, opcoId: true, serviceName: true, serviceKey: true, partnerId: true },
  });
  if (!existing) {
    throw new ServicePartnerMapActionError("Mapping not found", 404);
  }

  const serviceName = parsed.data.serviceName.trim();
  const serviceKey = normalizeServiceKey(serviceName);

  const duplicate = await prisma.servicePartnerMap.findFirst({
    where: {
      opcoId,
      serviceKey,
      isDeleted: false,
      id: { not: mapId },
    },
    select: { id: true },
  });
  if (duplicate) {
    throw new ServicePartnerMapActionError(
      "A mapping already exists for this Service/Application name on this OpCo",
      409,
    );
  }

  const updated = await prisma.servicePartnerMap.update({
    where: { id: mapId },
    data: {
      opcoId,
      serviceName,
      serviceKey,
      partnerId,
      updatedByUserId: actorUserId,
    },
    include: listInclude,
  });

  await writeServicePartnerMapAuditLog({
    actorUserId,
    action: "SERVICE_PARTNER_MAP_UPDATED",
    mapId: updated.id,
    message: `Service–Partner map updated: ${updated.serviceName} → ${updated.partner.name}`,
    metadata: {
      before: {
        serviceName: existing.serviceName,
        partnerId: existing.partnerId.toString(),
      },
      after: {
        serviceName: updated.serviceName,
        partnerId: updated.partnerId.toString(),
      },
    },
  });

  return mapRow(updated);
}

export async function deleteServicePartnerMap(
  mapIdRaw: string,
  actorUserId: bigint,
): Promise<void> {
  if (!/^\d+$/.test(mapIdRaw)) {
    throw new ServicePartnerMapActionError("Invalid map id", 400);
  }

  const mapId = BigInt(mapIdRaw);
  const existing = await prisma.servicePartnerMap.findFirst({
    where: { id: mapId, isDeleted: false },
    select: { id: true, serviceName: true, serviceKey: true },
  });
  if (!existing) {
    throw new ServicePartnerMapActionError("Mapping not found", 404);
  }

  // Free the unique (opco, service_key) for future re-use.
  const freedKey = `${existing.serviceKey}__deleted__${existing.id}`;

  await prisma.servicePartnerMap.update({
    where: { id: mapId },
    data: {
      serviceKey: freedKey,
      isDeleted: true,
      deletedAt: new Date(),
      deletedByUserId: actorUserId,
      updatedByUserId: actorUserId,
    },
  });

  await writeServicePartnerMapAuditLog({
    actorUserId,
    action: "SERVICE_PARTNER_MAP_DELETED",
    mapId,
    message: `Service–Partner map deleted: ${existing.serviceName}`,
    metadata: { serviceName: existing.serviceName },
  });
}

export type ImportServicePartnerMapsResult = {
  created: number;
  updated: number;
  partnersCreated: number;
  partnersRestored: number;
  issues: ServicePartnerMapImportIssue[];
};

export type ImportPartnerRef = {
  id: bigint;
  name: string;
  isDeleted: boolean;
};

/**
 * Resolve a Partner for map import: reuse active, restore soft-deleted, or create ACTIVE.
 * Mutates `partners` when creating so later rows reuse the same org.
 */
export async function ensurePartnerForMapImport(
  partnerName: string,
  partners: ImportPartnerRef[],
  actorUserId: bigint,
): Promise<{
  partner: ImportPartnerRef;
  created: boolean;
  restored: boolean;
}> {
  const trimmed = partnerName.trim();
  const activePartners = partners.filter((partner) => !partner.isDeleted);
  const matchedActive = matchLinkedPartner(trimmed, activePartners);
  if (matchedActive) {
    return { partner: matchedActive, created: false, restored: false };
  }

  const deletedPartners = partners.filter((partner) => partner.isDeleted);
  const matchedDeleted = matchLinkedPartner(trimmed, deletedPartners);
  if (matchedDeleted) {
    const activeStatusId = await getLookupId("USER_STATUS", "ACTIVE");
    await prisma.partner.update({
      where: { id: matchedDeleted.id },
      data: {
        name: trimmed,
        statusId: activeStatusId,
        isDeleted: false,
        deletedAt: null,
        deletedByUserId: null,
        updatedByUserId: actorUserId,
      },
    });
    matchedDeleted.isDeleted = false;
    matchedDeleted.name = trimmed;
    await writePartnerAuditLog({
      actorUserId,
      action: "PARTNER_UPDATED",
      partnerId: matchedDeleted.id,
      message: `Partner restored via Service–Partner map import: ${trimmed}`,
      metadata: {
        name: trimmed,
        status: "ACTIVE",
        source: "service_partner_map_import",
      },
    });
    return { partner: matchedDeleted, created: false, restored: true };
  }

  const activeStatusId = await getLookupId("USER_STATUS", "ACTIVE");
  const createdRow = await prisma.partner.create({
    data: {
      name: trimmed,
      statusId: activeStatusId,
      createdByUserId: actorUserId,
      updatedByUserId: actorUserId,
    },
    select: { id: true, name: true },
  });
  const ref: ImportPartnerRef = {
    id: createdRow.id,
    name: createdRow.name,
    isDeleted: false,
  };
  partners.push(ref);
  await writePartnerAuditLog({
    actorUserId,
    action: "PARTNER_CREATED",
    partnerId: createdRow.id,
    message: `Partner created via Service–Partner map import: ${createdRow.name}`,
    metadata: {
      name: createdRow.name,
      status: "ACTIVE",
      source: "service_partner_map_import",
    },
  });
  return { partner: ref, created: true, restored: false };
}

async function upsertParsedRow(
  row: ParsedServicePartnerMapRow,
  actorUserId: bigint,
  opcos: { id: bigint; name: string }[],
  partners: ImportPartnerRef[],
): Promise<
  | { kind: "created"; partnersCreated: number; partnersRestored: number }
  | { kind: "updated"; partnersCreated: number; partnersRestored: number }
  | ServicePartnerMapImportIssue
> {
  const opco = matchLinkedPartner(row.opcoName, opcos);
  if (!opco) {
    return {
      rowNumber: row.rowNumber,
      message: `Unknown OpCo "${row.opcoName}"`,
    };
  }

  const ensured = await ensurePartnerForMapImport(
    row.partnerName,
    partners,
    actorUserId,
  );
  const partnersCreated = ensured.created ? 1 : 0;
  const partnersRestored = ensured.restored ? 1 : 0;
  const partner = ensured.partner;

  const serviceName = row.serviceName.trim();
  const serviceKey = normalizeServiceKey(serviceName);

  const active = await prisma.servicePartnerMap.findFirst({
    where: { opcoId: opco.id, serviceKey, isDeleted: false },
    select: { id: true, partnerId: true },
  });

  if (active) {
    await prisma.servicePartnerMap.update({
      where: { id: active.id },
      data: {
        serviceName,
        partnerId: partner.id,
        updatedByUserId: actorUserId,
      },
    });
    return { kind: "updated", partnersCreated, partnersRestored };
  }

  await prisma.servicePartnerMap.create({
    data: {
      opcoId: opco.id,
      serviceName,
      serviceKey,
      partnerId: partner.id,
      createdByUserId: actorUserId,
      updatedByUserId: actorUserId,
    },
  });
  return { kind: "created", partnersCreated, partnersRestored };
}

export async function importServicePartnerMapsFromExcel(
  buffer: Buffer,
  actorUserId: bigint,
): Promise<ImportServicePartnerMapsResult> {
  const parsed = await parseServicePartnerMapsExcel(buffer);
  const issues: ServicePartnerMapImportIssue[] = [...parsed.issues];
  const emptyResult: ImportServicePartnerMapsResult = {
    created: 0,
    updated: 0,
    partnersCreated: 0,
    partnersRestored: 0,
    issues,
  };

  if (parsed.rows.length === 0) {
    return emptyResult;
  }

  const [opcos, partnerRows] = await Promise.all([
    prisma.opco.findMany({
      where: { isDeleted: false, status: { code: "ACTIVE" } },
      select: { id: true, name: true },
    }),
    prisma.partner.findMany({
      select: { id: true, name: true, isDeleted: true },
    }),
  ]);

  const partners: ImportPartnerRef[] = partnerRows.map((row) => ({
    id: row.id,
    name: row.name,
    isDeleted: row.isDeleted,
  }));

  let created = 0;
  let updated = 0;
  let partnersCreated = 0;
  let partnersRestored = 0;

  for (const row of parsed.rows) {
    const result = await upsertParsedRow(row, actorUserId, opcos, partners);
    if ("kind" in result) {
      if (result.kind === "created") {
        created += 1;
      } else {
        updated += 1;
      }
      partnersCreated += result.partnersCreated;
      partnersRestored += result.partnersRestored;
    } else {
      issues.push(result);
    }
  }

  await writeServicePartnerMapAuditLog({
    actorUserId,
    action: "SERVICE_PARTNER_MAP_IMPORTED",
    mapId: BigInt(1),
    message: `Service–Partner maps imported (created ${created}, updated ${updated}, partnersCreated ${partnersCreated}, partnersRestored ${partnersRestored}, issues ${issues.length})`,
    metadata: {
      created,
      updated,
      partnersCreated,
      partnersRestored,
      issueCount: issues.length,
    },
  });

  return { created, updated, partnersCreated, partnersRestored, issues };
}

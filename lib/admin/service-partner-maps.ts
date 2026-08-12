/**
 * Admin Service–Partner map CRUD and Excel upsert import.
 */
import { writeServicePartnerMapAuditLog } from "@/lib/admin/audit";
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
import { normalizeServiceKey } from "@/lib/platform/service-partner-map";
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
  serviceName: string;
  serviceKey: string;
  partnerId: bigint;
  partner: { name: string };
}): ServicePartnerMapListItem {
  return {
    id: row.id.toString(),
    serviceName: row.serviceName,
    serviceKey: row.serviceKey,
    partnerId: row.partnerId.toString(),
    partnerName: row.partner.name,
  };
}

const listInclude = {
  partner: { select: { name: true } },
} as const;

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
    orderBy: { serviceName: "asc" },
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

  if (!/^\d+$/.test(parsed.data.partnerId)) {
    throw new ServicePartnerMapActionError("Invalid Partner id", 400);
  }

  const partnerId = BigInt(parsed.data.partnerId);
  await requireActivePartner(partnerId);

  const serviceName = parsed.data.serviceName.trim();
  const serviceKey = normalizeServiceKey(serviceName);

  const existing = await prisma.servicePartnerMap.findFirst({
    where: { serviceKey, isDeleted: false },
    select: { id: true },
  });
  if (existing) {
    throw new ServicePartnerMapActionError(
      "A mapping already exists for this Service/Application name",
      409,
    );
  }

  const created = await prisma.servicePartnerMap.create({
    data: {
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

  if (!/^\d+$/.test(parsed.data.partnerId)) {
    throw new ServicePartnerMapActionError("Invalid Partner id", 400);
  }

  const mapId = BigInt(mapIdRaw);
  const partnerId = BigInt(parsed.data.partnerId);
  await requireActivePartner(partnerId);

  const existing = await prisma.servicePartnerMap.findFirst({
    where: { id: mapId, isDeleted: false },
    select: { id: true, serviceName: true, serviceKey: true, partnerId: true },
  });
  if (!existing) {
    throw new ServicePartnerMapActionError("Mapping not found", 404);
  }

  const serviceName = parsed.data.serviceName.trim();
  const serviceKey = normalizeServiceKey(serviceName);

  const duplicate = await prisma.servicePartnerMap.findFirst({
    where: {
      serviceKey,
      isDeleted: false,
      id: { not: mapId },
    },
    select: { id: true },
  });
  if (duplicate) {
    throw new ServicePartnerMapActionError(
      "A mapping already exists for this Service/Application name",
      409,
    );
  }

  const updated = await prisma.servicePartnerMap.update({
    where: { id: mapId },
    data: {
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

  // Free the unique service_key for future re-use.
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
  issues: ServicePartnerMapImportIssue[];
};

async function upsertParsedRow(
  row: ParsedServicePartnerMapRow,
  actorUserId: bigint,
  partnerByName: Map<string, { id: bigint; name: string }>,
): Promise<"created" | "updated" | ServicePartnerMapImportIssue> {
  const partner = partnerByName.get(normalizeServiceKey(row.partnerName));
  if (!partner) {
    return {
      rowNumber: row.rowNumber,
      message: `Unknown Partner "${row.partnerName}"`,
    };
  }

  const serviceName = row.serviceName.trim();
  const serviceKey = normalizeServiceKey(serviceName);

  const active = await prisma.servicePartnerMap.findFirst({
    where: { serviceKey, isDeleted: false },
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
    return "updated";
  }

  await prisma.servicePartnerMap.create({
    data: {
      serviceName,
      serviceKey,
      partnerId: partner.id,
      createdByUserId: actorUserId,
      updatedByUserId: actorUserId,
    },
  });
  return "created";
}

export async function importServicePartnerMapsFromExcel(
  buffer: Buffer,
  actorUserId: bigint,
): Promise<ImportServicePartnerMapsResult> {
  const parsed = await parseServicePartnerMapsExcel(buffer);
  const issues: ServicePartnerMapImportIssue[] = [...parsed.issues];

  if (parsed.rows.length === 0 && issues.length > 0) {
    return { created: 0, updated: 0, issues };
  }

  const partners = await prisma.partner.findMany({
    where: { isDeleted: false, status: { code: "ACTIVE" } },
    select: { id: true, name: true },
  });
  const partnerByName = new Map(
    partners.map((partner) => [normalizeServiceKey(partner.name), partner]),
  );

  let created = 0;
  let updated = 0;

  for (const row of parsed.rows) {
    const result = await upsertParsedRow(row, actorUserId, partnerByName);
    if (result === "created") {
      created += 1;
    } else if (result === "updated") {
      updated += 1;
    } else {
      issues.push(result);
    }
  }

  await writeServicePartnerMapAuditLog({
    actorUserId,
    action: "SERVICE_PARTNER_MAP_IMPORTED",
    mapId: BigInt(1),
    message: `Service–Partner maps imported (created ${created}, updated ${updated}, issues ${issues.length})`,
    metadata: { created, updated, issueCount: issues.length },
  });

  return { created, updated, issues };
}

/**
 * Admin OpCo per-service regulatory fee list, patch, and Excel import.
 */
import { writeServicePartnerMapAuditLog } from "@/lib/admin/audit";
import {
  buildOpcoRegulatoryFeesTemplateBuffer,
  parseOpcoRegulatoryFeesExcel,
} from "@/lib/admin/opco-regulatory-fees-excel";
import type {
  OpcoRegulatoryFeeImportIssue,
  OpcoRegulatoryFeeRow,
  OpcoRegulatoryFeesPage,
} from "@/lib/admin/opco-regulatory-fees.shared";
import {
  updateOpcoRegulatoryFeesSchema,
  type UpdateOpcoRegulatoryFeesInput,
} from "@/lib/admin/validation/opco-regulatory-fees";
import { DomainError } from "@/lib/errors/app-error";
import {
  matchServiceMapRow,
  normalizeServiceKey,
} from "@/lib/platform/service-partner-map";
import { prisma } from "@/lib/prisma";
import type { Decimal } from "@prisma/client/runtime/library";

export type {
  OpcoRegulatoryFeeImportIssue,
  OpcoRegulatoryFeeRow,
  OpcoRegulatoryFeesPage,
} from "@/lib/admin/opco-regulatory-fees.shared";

export class OpcoRegulatoryFeeError extends DomainError {
  constructor(keyOrMessage: string, status?: number) {
    super("OpcoRegulatoryFeeError", keyOrMessage, status);
  }
}

function mapFeePercent(value: Decimal | number | string | null | undefined): number {
  if (value === null || value === undefined) {
    return 0;
  }
  const parsed =
    typeof value === "number"
      ? value
      : Number.parseFloat(typeof value === "string" ? value : value.toString());
  return Number.isFinite(parsed) ? parsed : 0;
}

function mapRow(row: {
  id: bigint;
  serviceName: string;
  serviceKey: string;
  partnerId: bigint;
  regulatoryFeePercent: Decimal;
  partner: { name: string };
}): OpcoRegulatoryFeeRow {
  return {
    id: row.id.toString(),
    serviceName: row.serviceName,
    serviceKey: row.serviceKey,
    partnerId: row.partnerId.toString(),
    partnerName: row.partner.name,
    regulatoryFeePercent: mapFeePercent(row.regulatoryFeePercent),
  };
}

async function requireOpco(opcoIdRaw: string): Promise<{ id: bigint; name: string }> {
  if (!/^\d+$/.test(opcoIdRaw)) {
    throw new OpcoRegulatoryFeeError("Invalid OpCo id", 400);
  }
  const opco = await prisma.opco.findFirst({
    where: { id: BigInt(opcoIdRaw), isDeleted: false },
    select: { id: true, name: true },
  });
  if (!opco) {
    throw new OpcoRegulatoryFeeError("OpCo not found", 404);
  }
  return opco;
}

export async function getOpcoRegulatoryFeesPage(
  opcoIdRaw: string,
): Promise<OpcoRegulatoryFeesPage> {
  const opco = await requireOpco(opcoIdRaw);
  const rows = await prisma.servicePartnerMap.findMany({
    where: { opcoId: opco.id, isDeleted: false },
    include: { partner: { select: { name: true } } },
    orderBy: [{ serviceName: "asc" }],
  });
  return {
    opcoId: opco.id.toString(),
    opcoName: opco.name,
    rows: rows.map(mapRow),
  };
}

export async function updateOpcoRegulatoryFees(
  opcoIdRaw: string,
  rawInput: UpdateOpcoRegulatoryFeesInput,
  actorUserId: bigint,
): Promise<OpcoRegulatoryFeesPage> {
  const opco = await requireOpco(opcoIdRaw);
  const parsed = updateOpcoRegulatoryFeesSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new OpcoRegulatoryFeeError(
      parsed.error.issues[0]?.message ?? "Invalid input",
    );
  }

  const mapIds = parsed.data.updates.map((u) => BigInt(u.mapId));
  const existing = await prisma.servicePartnerMap.findMany({
    where: {
      id: { in: mapIds },
      opcoId: opco.id,
      isDeleted: false,
    },
    select: { id: true },
  });
  if (existing.length !== mapIds.length) {
    throw new OpcoRegulatoryFeeError(
      "One or more services were not found for this OpCo",
      404,
    );
  }

  await prisma.$transaction(
    parsed.data.updates.map((update) =>
      prisma.servicePartnerMap.update({
        where: { id: BigInt(update.mapId) },
        data: {
          regulatoryFeePercent: update.regulatoryFeePercent,
          updatedByUserId: actorUserId,
        },
      }),
    ),
  );

  await writeServicePartnerMapAuditLog({
    actorUserId,
    action: "SERVICE_PARTNER_MAP_UPDATED",
    mapId: BigInt(parsed.data.updates[0]!.mapId),
    message: `Regulatory fees updated for ${opco.name} (${parsed.data.updates.length} service(s))`,
    metadata: {
      opcoId: opco.id.toString(),
      updates: parsed.data.updates,
    },
  });

  return getOpcoRegulatoryFeesPage(opcoIdRaw);
}

export async function buildOpcoRegulatoryFeesTemplate(
  opcoIdRaw: string,
): Promise<{ filename: string; buffer: Buffer }> {
  const page = await getOpcoRegulatoryFeesPage(opcoIdRaw);
  const buffer = await buildOpcoRegulatoryFeesTemplateBuffer({
    opcoName: page.opcoName,
    rows: page.rows.map((row) => ({
      serviceName: row.serviceName,
      regulatoryFeePercent: row.regulatoryFeePercent,
    })),
  });
  const slug = page.opcoName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return {
    filename: `regulatory_fees_${slug || "opco"}.xlsx`,
    buffer,
  };
}

export async function importOpcoRegulatoryFeesFromExcel(
  opcoIdRaw: string,
  buffer: ArrayBuffer | Buffer | Uint8Array,
  actorUserId: bigint,
): Promise<{
  updated: number;
  issues: OpcoRegulatoryFeeImportIssue[];
  page: OpcoRegulatoryFeesPage;
}> {
  const opco = await requireOpco(opcoIdRaw);
  const parsed = await parseOpcoRegulatoryFeesExcel(buffer);
  const issues: OpcoRegulatoryFeeImportIssue[] = [...parsed.issues];

  const maps = await prisma.servicePartnerMap.findMany({
    where: { opcoId: opco.id, isDeleted: false },
    select: {
      id: true,
      serviceName: true,
      serviceKey: true,
    },
  });

  let updated = 0;
  for (const row of parsed.rows) {
    const matched = matchServiceMapRow(
      {
        serviceKey: normalizeServiceKey(row.serviceName),
        serviceName: row.serviceName,
      },
      maps,
    );
    if (!matched) {
      issues.push({
        rowNumber: row.rowNumber,
        message: `Unknown service for this OpCo: "${row.serviceName}"`,
      });
      continue;
    }

    await prisma.servicePartnerMap.update({
      where: { id: matched.id },
      data: {
        regulatoryFeePercent: row.regulatoryFeePercent,
        updatedByUserId: actorUserId,
      },
    });
    updated += 1;
  }

  if (updated > 0) {
    await writeServicePartnerMapAuditLog({
      actorUserId,
      action: "SERVICE_PARTNER_MAP_IMPORTED",
      mapId: maps[0]?.id ?? BigInt(0),
      message: `Regulatory fees imported for ${opco.name}: ${updated} updated`,
      metadata: {
        opcoId: opco.id.toString(),
        updated,
        issueCount: issues.length,
      },
    });
  }

  return {
    updated,
    issues,
    page: await getOpcoRegulatoryFeesPage(opcoIdRaw),
  };
}

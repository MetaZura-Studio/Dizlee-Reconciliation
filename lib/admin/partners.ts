/**
 * Admin Partner CRUD — ACTIVE/INACTIVE status, soft delete, user counts, audit trail.
 */
import { writePartnerAuditLog } from "@/lib/admin/audit";
import { getLookupId } from "@/lib/admin/lookups";
import type {
  AdminEntityStatus,
  PartnerListItem,
} from "@/lib/admin/partners.shared";
import {
  parsePartnersExcel,
  type PartnerParseIssue,
} from "@/lib/admin/partners-excel";
import {
  createPartnerSchema,
  updatePartnerSchema,
  type CreatePartnerInput,
  type UpdatePartnerInput,
} from "@/lib/admin/validation/partners";
import { prisma } from "@/lib/prisma";
import { DomainError } from "@/lib/errors/app-error";
import { compactPartnerKey } from "@/lib/platform/service-partner-map";

export type {
  AdminEntityStatus,
  PartnerListItem,
} from "@/lib/admin/partners.shared";
export { formatEntityStatusLabel } from "@/lib/admin/partners.shared";

export class PartnerActionError extends DomainError {
  constructor(keyOrMessage: string, status?: number) {
    super("PartnerActionError", keyOrMessage, status);
  }
}

function mapStatusCode(code: string): AdminEntityStatus {
  if (code === "ACTIVE" || code === "INACTIVE") {
    return code;
  }
  return "INACTIVE";
}

function mapPartner(row: {
  id: bigint;
  name: string;
  status: { code: string; label: string };
  _count: { users: number };
}): PartnerListItem {
  const status = mapStatusCode(row.status.code);
  return {
    id: row.id.toString(),
    name: row.name,
    status,
    statusLabel: row.status.label,
    userCount: row._count.users,
  };
}

const partnerListInclude = {
  status: { select: { code: true, label: true } },
  _count: {
    select: {
      users: { where: { isDeleted: false } },
    },
  },
} as const;

export async function listPartners(): Promise<PartnerListItem[]> {
  const rows = await prisma.partner.findMany({
    where: { isDeleted: false },
    include: partnerListInclude,
    orderBy: { name: "asc" },
  });

  return rows.map(mapPartner);
}

export async function createPartner(
  rawInput: CreatePartnerInput,
  actorUserId: bigint,
): Promise<PartnerListItem> {
  const parsed = createPartnerSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new PartnerActionError(
      parsed.error.issues[0]?.message ?? "Invalid input",
    );
  }

  const statusId = await getLookupId("USER_STATUS", parsed.data.status);

  const created = await prisma.partner.create({
    data: {
      name: parsed.data.name,
      statusId,
      createdByUserId: actorUserId,
      updatedByUserId: actorUserId,
    },
    include: partnerListInclude,
  });

  await writePartnerAuditLog({
    actorUserId,
    action: "PARTNER_CREATED",
    partnerId: created.id,
    message: `Partner created: ${created.name}`,
    metadata: {
      name: created.name,
      status: parsed.data.status,
    },
  });

  return mapPartner(created);
}

export async function updatePartner(
  partnerIdRaw: string,
  rawInput: UpdatePartnerInput,
  actorUserId: bigint,
): Promise<PartnerListItem> {
  if (!/^\d+$/.test(partnerIdRaw)) {
    throw new PartnerActionError("Invalid Partner id", 400);
  }

  const parsed = updatePartnerSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new PartnerActionError(
      parsed.error.issues[0]?.message ?? "Invalid input",
    );
  }

  const partnerId = BigInt(partnerIdRaw);
  const existing = await prisma.partner.findFirst({
    where: { id: partnerId, isDeleted: false },
    select: { id: true, name: true },
  });
  if (!existing) {
    throw new PartnerActionError("Partner not found", 404);
  }

  const statusId = await getLookupId("USER_STATUS", parsed.data.status);

  const updated = await prisma.partner.update({
    where: { id: partnerId },
    data: {
      name: parsed.data.name,
      statusId,
      updatedByUserId: actorUserId,
    },
    include: partnerListInclude,
  });

  await writePartnerAuditLog({
    actorUserId,
    action: "PARTNER_UPDATED",
    partnerId: updated.id,
    message: `Partner updated: ${updated.name}`,
    metadata: {
      before: { name: existing.name },
      after: {
        name: updated.name,
        status: parsed.data.status,
      },
    },
  });

  return mapPartner(updated);
}

export async function deletePartner(
  partnerIdRaw: string,
  actorUserId: bigint,
): Promise<void> {
  if (!/^\d+$/.test(partnerIdRaw)) {
    throw new PartnerActionError("Invalid Partner id", 400);
  }

  const partnerId = BigInt(partnerIdRaw);
  const existing = await prisma.partner.findFirst({
    where: { id: partnerId, isDeleted: false },
    select: { id: true, name: true },
  });
  if (!existing) {
    throw new PartnerActionError("Partner not found", 404);
  }

  await prisma.partner.update({
    where: { id: partnerId },
    data: {
      isDeleted: true,
      deletedAt: new Date(),
      deletedByUserId: actorUserId,
      updatedByUserId: actorUserId,
    },
  });

  await writePartnerAuditLog({
    actorUserId,
    action: "PARTNER_DELETED",
    partnerId,
    message: `Partner deleted: ${existing.name}`,
    metadata: { name: existing.name },
  });
}

export type ImportPartnersResult = {
  created: number;
  skipped: number;
  restored: number;
  issues: PartnerParseIssue[];
};

export async function importPartnersFromExcel(
  buffer: Buffer,
  actorUserId: bigint,
): Promise<ImportPartnersResult> {
  const parsed = await parsePartnersExcel(buffer);
  const issues: PartnerParseIssue[] = [...parsed.issues];

  if (parsed.rows.length === 0) {
    return { created: 0, skipped: 0, restored: 0, issues };
  }

  const existing = await prisma.partner.findMany({
    select: {
      id: true,
      name: true,
      isDeleted: true,
    },
  });

  const byKey = new Map<
    string,
    { id: bigint; name: string; isDeleted: boolean }
  >();
  for (const partner of existing) {
    const key = compactPartnerKey(partner.name);
    if (!key) {
      continue;
    }
    const current = byKey.get(key);
    // Prefer active over soft-deleted when multiple match.
    if (!current || (current.isDeleted && !partner.isDeleted)) {
      byKey.set(key, partner);
    }
  }

  const [activeStatusId, inactiveStatusId] = await Promise.all([
    getLookupId("USER_STATUS", "ACTIVE"),
    getLookupId("USER_STATUS", "INACTIVE"),
  ]);

  let created = 0;
  let skipped = 0;
  let restored = 0;

  for (const row of parsed.rows) {
    const key = compactPartnerKey(row.name);
    const match = byKey.get(key);
    const statusId =
      row.status === "ACTIVE" ? activeStatusId : inactiveStatusId;

    if (match && !match.isDeleted) {
      skipped += 1;
      continue;
    }

    if (match && match.isDeleted) {
      await prisma.partner.update({
        where: { id: match.id },
        data: {
          name: row.name,
          statusId,
          isDeleted: false,
          deletedAt: null,
          deletedByUserId: null,
          updatedByUserId: actorUserId,
        },
      });
      byKey.set(key, { id: match.id, name: row.name, isDeleted: false });
      restored += 1;
      await writePartnerAuditLog({
        actorUserId,
        action: "PARTNER_UPDATED",
        partnerId: match.id,
        message: `Partner restored via import: ${row.name}`,
        metadata: { name: row.name, status: row.status, source: "excel_import" },
      });
      continue;
    }

    const createdRow = await prisma.partner.create({
      data: {
        name: row.name,
        statusId,
        createdByUserId: actorUserId,
        updatedByUserId: actorUserId,
      },
      select: { id: true, name: true },
    });
    byKey.set(key, {
      id: createdRow.id,
      name: createdRow.name,
      isDeleted: false,
    });
    created += 1;
    await writePartnerAuditLog({
      actorUserId,
      action: "PARTNER_CREATED",
      partnerId: createdRow.id,
      message: `Partner created via import: ${createdRow.name}`,
      metadata: {
        name: createdRow.name,
        status: row.status,
        source: "excel_import",
      },
    });
  }

  await writePartnerAuditLog({
    actorUserId,
    action: "PARTNER_IMPORTED",
    partnerId: BigInt(0),
    message: `Partners imported (created ${created}, skipped ${skipped}, restored ${restored}, issues ${issues.length})`,
    metadata: {
      created,
      skipped,
      restored,
      issueCount: issues.length,
    },
  });

  return { created, skipped, restored, issues };
}

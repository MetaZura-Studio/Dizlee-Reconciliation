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
  createPartnerSchema,
  updatePartnerSchema,
  type CreatePartnerInput,
  type UpdatePartnerInput,
} from "@/lib/admin/validation/partners";
import { prisma } from "@/lib/prisma";

export type {
  AdminEntityStatus,
  PartnerListItem,
} from "@/lib/admin/partners.shared";
export { formatEntityStatusLabel } from "@/lib/admin/partners.shared";

export class PartnerActionError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "PartnerActionError";
    this.status = status;
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

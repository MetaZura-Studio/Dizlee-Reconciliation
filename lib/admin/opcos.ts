/**
 * Admin OpCo CRUD — default currency, ACTIVE/INACTIVE status, soft delete with audit.
 * OpCo names reserved for linking rules are enforced at link layer, not here.
 */
import { writeOpcoAuditLog } from "@/lib/admin/audit";
import { getLookupId } from "@/lib/admin/lookups";
import type {
  AdminEntityStatus,
  OpcoListItem,
} from "@/lib/admin/opcos.shared";
import {
  createOpcoSchema,
  updateOpcoSchema,
  type CreateOpcoInput,
  type UpdateOpcoInput,
} from "@/lib/admin/validation/opcos";
import { prisma } from "@/lib/prisma";

export type { AdminEntityStatus, OpcoListItem } from "@/lib/admin/opcos.shared";
export { formatEntityStatusLabel } from "@/lib/admin/opcos.shared";

export class OpcoActionError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "OpcoActionError";
    this.status = status;
  }
}

function mapStatusCode(code: string): AdminEntityStatus {
  if (code === "ACTIVE" || code === "INACTIVE") {
    return code;
  }
  return "INACTIVE";
}

function mapOpco(row: {
  id: bigint;
  name: string;
  defaultCurrencyId: bigint;
  status: { code: string; label: string };
  defaultCurrency: { isoCode: string };
  _count: { users: number };
}): OpcoListItem {
  const status = mapStatusCode(row.status.code);
  return {
    id: row.id.toString(),
    name: row.name,
    status,
    statusLabel: row.status.label,
    defaultCurrencyId: row.defaultCurrencyId.toString(),
    defaultCurrencyIso: row.defaultCurrency.isoCode,
    userCount: row._count.users,
  };
}

const opcoListInclude = {
  status: { select: { code: true, label: true } },
  defaultCurrency: { select: { isoCode: true } },
  _count: {
    select: {
      users: { where: { isDeleted: false } },
    },
  },
} as const;

async function assertCurrencyExists(currencyId: bigint): Promise<void> {
  const currency = await prisma.currency.findFirst({
    where: { id: currencyId, isDeleted: false },
    select: { id: true },
  });

  if (!currency) {
    throw new OpcoActionError("Selected currency was not found", 404);
  }
}

export async function listOpcos(): Promise<OpcoListItem[]> {
  const rows = await prisma.opco.findMany({
    where: { isDeleted: false },
    include: opcoListInclude,
    orderBy: { name: "asc" },
  });

  return rows.map(mapOpco);
}

export async function createOpco(
  rawInput: CreateOpcoInput,
  actorUserId: bigint,
): Promise<OpcoListItem> {
  const parsed = createOpcoSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new OpcoActionError(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const defaultCurrencyId = BigInt(parsed.data.defaultCurrencyId);
  await assertCurrencyExists(defaultCurrencyId);
  const statusId = await getLookupId("USER_STATUS", parsed.data.status);

  const created = await prisma.opco.create({
    data: {
      name: parsed.data.name,
      defaultCurrencyId,
      statusId,
      createdByUserId: actorUserId,
      updatedByUserId: actorUserId,
    },
    include: opcoListInclude,
  });

  await writeOpcoAuditLog({
    actorUserId,
    action: "OPCO_CREATED",
    opcoId: created.id,
    message: `OpCo created: ${created.name}`,
    metadata: {
      name: created.name,
      defaultCurrencyId: created.defaultCurrencyId.toString(),
      status: parsed.data.status,
    },
  });

  return mapOpco(created);
}

export async function updateOpco(
  opcoIdRaw: string,
  rawInput: UpdateOpcoInput,
  actorUserId: bigint,
): Promise<OpcoListItem> {
  if (!/^\d+$/.test(opcoIdRaw)) {
    throw new OpcoActionError("Invalid OpCo id", 400);
  }

  const parsed = updateOpcoSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new OpcoActionError(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const opcoId = BigInt(opcoIdRaw);
  const existing = await prisma.opco.findFirst({
    where: { id: opcoId, isDeleted: false },
    select: { id: true, name: true },
  });
  if (!existing) {
    throw new OpcoActionError("OpCo not found", 404);
  }

  const defaultCurrencyId = BigInt(parsed.data.defaultCurrencyId);
  await assertCurrencyExists(defaultCurrencyId);
  const statusId = await getLookupId("USER_STATUS", parsed.data.status);

  const updated = await prisma.opco.update({
    where: { id: opcoId },
    data: {
      name: parsed.data.name,
      defaultCurrencyId,
      statusId,
      updatedByUserId: actorUserId,
    },
    include: opcoListInclude,
  });

  await writeOpcoAuditLog({
    actorUserId,
    action: "OPCO_UPDATED",
    opcoId: updated.id,
    message: `OpCo updated: ${updated.name}`,
    metadata: {
      before: { name: existing.name },
      after: {
        name: updated.name,
        defaultCurrencyId: updated.defaultCurrencyId.toString(),
        status: parsed.data.status,
      },
    },
  });

  return mapOpco(updated);
}

export async function deleteOpco(
  opcoIdRaw: string,
  actorUserId: bigint,
): Promise<void> {
  if (!/^\d+$/.test(opcoIdRaw)) {
    throw new OpcoActionError("Invalid OpCo id", 400);
  }

  const opcoId = BigInt(opcoIdRaw);
  const existing = await prisma.opco.findFirst({
    where: { id: opcoId, isDeleted: false },
    select: { id: true, name: true },
  });
  if (!existing) {
    throw new OpcoActionError("OpCo not found", 404);
  }

  await prisma.opco.update({
    where: { id: opcoId },
    data: {
      isDeleted: true,
      deletedAt: new Date(),
      deletedByUserId: actorUserId,
      updatedByUserId: actorUserId,
    },
  });

  await writeOpcoAuditLog({
    actorUserId,
    action: "OPCO_DELETED",
    opcoId,
    message: `OpCo deleted: ${existing.name}`,
    metadata: { name: existing.name },
  });
}

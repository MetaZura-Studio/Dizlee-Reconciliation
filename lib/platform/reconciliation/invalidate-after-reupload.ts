/**
 * Soft-delete reconciliations (and period consolidation) when OpCo data changes
 * after a reupload so Dizlee must re-run affected lanes.
 */

import { prisma } from "@/lib/prisma";

export async function softDeletePartnerReconciliations(params: {
  opcoId: bigint;
  partnerId: bigint;
  year: number;
  month: number;
  deletedByUserId: bigint;
  deletedAt?: Date;
}): Promise<number> {
  const deletedAt = params.deletedAt ?? new Date();

  const rows = await prisma.reconciliation.findMany({
    where: {
      opcoId: params.opcoId,
      partnerId: params.partnerId,
      year: params.year,
      month: params.month,
      isDeleted: false,
    },
    select: { id: true },
  });

  if (rows.length === 0) {
    return 0;
  }

  const ids = rows.map((row) => row.id);

  await prisma.$transaction([
    prisma.reconciliationItem.updateMany({
      where: {
        reconciliationId: { in: ids },
        isDeleted: false,
      },
      data: {
        isDeleted: true,
        deletedAt,
        deletedByUserId: params.deletedByUserId,
      },
    }),
    prisma.reconciliation.updateMany({
      where: { id: { in: ids }, isDeleted: false },
      data: {
        isDeleted: true,
        deletedAt,
        deletedByUserId: params.deletedByUserId,
        updatedByUserId: params.deletedByUserId,
      },
    }),
  ]);

  return rows.length;
}

export async function softDeleteOpcoPeriodConsolidation(params: {
  opcoId: bigint;
  year: number;
  month: number;
  deletedByUserId: bigint;
  deletedAt?: Date;
}): Promise<boolean> {
  const deletedAt = params.deletedAt ?? new Date();

  const existing = await prisma.consolidation.findFirst({
    where: {
      opcoId: params.opcoId,
      year: params.year,
      month: params.month,
      isDeleted: false,
    },
    select: { id: true },
  });

  if (!existing) {
    return false;
  }

  await prisma.$transaction([
    prisma.consolidationItem.updateMany({
      where: {
        consolidationId: existing.id,
        isDeleted: false,
      },
      data: {
        isDeleted: true,
        deletedAt,
        deletedByUserId: params.deletedByUserId,
      },
    }),
    prisma.consolidation.update({
      where: { id: existing.id },
      data: {
        isDeleted: true,
        deletedAt,
        deletedByUserId: params.deletedByUserId,
        updatedByUserId: params.deletedByUserId,
      },
    }),
  ]);

  return true;
}

/**
 * Invalidate reconciliations / revenue share after report reupload.
 * Partner-lane path: soft-delete. OpCo monthly submission path: hard-delete period work.
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

/** Hard-delete every reconciliation (+ items) for an OpCo period. */
export async function hardDeleteAllOpcoPeriodReconciliations(params: {
  opcoId: bigint;
  year: number;
  month: number;
}): Promise<number> {
  const rows = await prisma.reconciliation.findMany({
    where: {
      opcoId: params.opcoId,
      year: params.year,
      month: params.month,
    },
    select: { id: true },
  });

  if (rows.length === 0) {
    return 0;
  }

  const ids = rows.map((row) => row.id);

  await prisma.$transaction([
    prisma.reconciliationItem.deleteMany({
      where: { reconciliationId: { in: ids } },
    }),
    prisma.reconciliation.deleteMany({
      where: { id: { in: ids } },
    }),
  ]);

  return rows.length;
}

/** Hard-delete revenue share report (+ items) for an OpCo period. */
export async function hardDeleteOpcoPeriodRevenueShareReport(params: {
  opcoId: bigint;
  year: number;
  month: number;
}): Promise<boolean> {
  const existing = await prisma.revenueShareReport.findMany({
    where: {
      opcoId: params.opcoId,
      year: params.year,
      month: params.month,
    },
    select: { id: true },
  });

  if (existing.length === 0) {
    return false;
  }

  const ids = existing.map((row) => row.id);

  await prisma.$transaction([
    prisma.revenueShareReportItem.deleteMany({
      where: { revenueShareReportId: { in: ids } },
    }),
    prisma.revenueShareReport.deleteMany({
      where: { id: { in: ids } },
    }),
  ]);

  return true;
}

/** Wipe Dizlee period work for an OpCo monthly file replace. */
export async function hardDeleteAllOpcoPeriodWork(params: {
  opcoId: bigint;
  year: number;
  month: number;
}): Promise<{
  reconciliations: number;
  revenueShare: boolean;
}> {
  const reconciliations = await hardDeleteAllOpcoPeriodReconciliations(params);
  const revenueShare = await hardDeleteOpcoPeriodRevenueShareReport(params);
  return { reconciliations, revenueShare };
}

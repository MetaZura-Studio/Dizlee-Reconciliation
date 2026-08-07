/**
 * Admin reconciliation negligible-variance percent — read/update app_settings row id 1.
 * Display value mirrors lib/platform/reconciliation-tolerance for Dizlee reconciliation runs.
 */
import { writeSettingsAuditLog } from "@/lib/admin/audit";
import {
  updateReconciliationToleranceSchema,
  type UpdateReconciliationToleranceInput,
} from "@/lib/admin/validation/reconciliation-tolerance";
import { getReconciliationTolerancePercent } from "@/lib/platform/reconciliation-tolerance";
import { prisma } from "@/lib/prisma";

export type ReconciliationToleranceView = {
  reconciliationNegligiblePercent: number;
};

export class ReconciliationToleranceError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "ReconciliationToleranceError";
    this.status = status;
  }
}

export async function getReconciliationTolerance(): Promise<ReconciliationToleranceView> {
  const settings = await prisma.appSettings.findFirst({
    where: { id: 1 },
    select: { reconciliationNegligiblePercent: true },
  });

  if (!settings) {
    throw new ReconciliationToleranceError(
      "Application settings could not be loaded.",
      500,
    );
  }

  return {
    reconciliationNegligiblePercent: await getReconciliationTolerancePercent(),
  };
}

export async function updateReconciliationTolerance(
  rawInput: UpdateReconciliationToleranceInput,
  actorUserId: bigint,
): Promise<ReconciliationToleranceView> {
  const parsed = updateReconciliationToleranceSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new ReconciliationToleranceError(
      parsed.error.issues[0]?.message ?? "Invalid input",
    );
  }

  const updated = await prisma.appSettings.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      reconciliationNegligiblePercent: parsed.data.reconciliationNegligiblePercent,
    },
    update: {
      reconciliationNegligiblePercent: parsed.data.reconciliationNegligiblePercent,
    },
    select: {
      reconciliationNegligiblePercent: true,
    },
  });

  const reconciliationNegligiblePercent = Number(
    updated.reconciliationNegligiblePercent ?? 0,
  );

  await writeSettingsAuditLog({
    actorUserId,
    action: "SETTINGS_TOLERANCE_UPDATED",
    message: "Reconciliation tolerance updated.",
    metadata: { reconciliationNegligiblePercent },
  });

  return { reconciliationNegligiblePercent };
}

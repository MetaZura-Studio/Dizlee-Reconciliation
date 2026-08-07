/**
 * Reconciliation negligible-variance threshold (percent) from app_settings id 1.
 * Read by Dizlee reconciliation engine and Admin tolerance screen.
 */
import { prisma } from "@/lib/prisma";

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  return Number(value as never);
}

export async function getReconciliationTolerancePercent(): Promise<number> {
  const settings = await prisma.appSettings.findFirst({
    where: { id: 1 },
    select: { reconciliationNegligiblePercent: true },
  });

  return toNumber(settings?.reconciliationNegligiblePercent) ?? 0;
}

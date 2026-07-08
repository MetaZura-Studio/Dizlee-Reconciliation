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

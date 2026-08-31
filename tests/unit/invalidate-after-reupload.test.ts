import { beforeEach, describe, expect, it, vi } from "vitest";

const mockedReconciliationFindMany = vi.fn();
const mockedReconciliationItemDeleteMany = vi.fn();
const mockedReconciliationDeleteMany = vi.fn();
const mockedConsolidationFindMany = vi.fn();
const mockedConsolidationItemDeleteMany = vi.fn();
const mockedConsolidationDeleteMany = vi.fn();
const mockedRsFindMany = vi.fn();
const mockedRsItemDeleteMany = vi.fn();
const mockedRsDeleteMany = vi.fn();
const mockedTransaction = vi.fn(async (ops: unknown[]) => ops);

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: (ops: unknown) => mockedTransaction(ops as unknown[]),
    reconciliation: {
      findMany: (...args: unknown[]) => mockedReconciliationFindMany(...args),
      deleteMany: (...args: unknown[]) => mockedReconciliationDeleteMany(...args),
    },
    reconciliationItem: {
      deleteMany: (...args: unknown[]) =>
        mockedReconciliationItemDeleteMany(...args),
    },
    consolidation: {
      findMany: (...args: unknown[]) => mockedConsolidationFindMany(...args),
      deleteMany: (...args: unknown[]) => mockedConsolidationDeleteMany(...args),
    },
    consolidationItem: {
      deleteMany: (...args: unknown[]) =>
        mockedConsolidationItemDeleteMany(...args),
    },
    revenueShareReport: {
      findMany: (...args: unknown[]) => mockedRsFindMany(...args),
      deleteMany: (...args: unknown[]) => mockedRsDeleteMany(...args),
    },
    revenueShareReportItem: {
      deleteMany: (...args: unknown[]) => mockedRsItemDeleteMany(...args),
    },
  },
}));

import {
  hardDeleteAllOpcoPeriodReconciliations,
  hardDeleteAllOpcoPeriodWork,
  hardDeleteOpcoPeriodConsolidation,
  hardDeleteOpcoPeriodRevenueShareReport,
} from "@/lib/platform/reconciliation/invalidate-after-reupload";

describe("hardDeleteAllOpcoPeriodWork", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedTransaction.mockImplementation(async (ops: unknown[]) => ops);
  });

  it("hard-deletes all reconciliations for the OpCo period (not partner-scoped)", async () => {
    mockedReconciliationFindMany.mockResolvedValue([{ id: 1 }, { id: 2 }]);
    mockedReconciliationItemDeleteMany.mockResolvedValue({ count: 4 });
    mockedReconciliationDeleteMany.mockResolvedValue({ count: 2 });

    const count = await hardDeleteAllOpcoPeriodReconciliations({
      opcoId: BigInt(5),
      year: 2026,
      month: 8,
    });

    expect(count).toBe(2);
    expect(mockedReconciliationFindMany).toHaveBeenCalledWith({
      where: { opcoId: BigInt(5), year: 2026, month: 8 },
      select: { id: true },
    });
    expect(mockedTransaction).toHaveBeenCalled();
  });

  it("hard-deletes consolidation and revenue share for the period", async () => {
    mockedConsolidationFindMany.mockResolvedValue([{ id: 10 }]);
    mockedConsolidationItemDeleteMany.mockResolvedValue({ count: 3 });
    mockedConsolidationDeleteMany.mockResolvedValue({ count: 1 });
    mockedRsFindMany.mockResolvedValue([{ id: 20 }]);
    mockedRsItemDeleteMany.mockResolvedValue({ count: 5 });
    mockedRsDeleteMany.mockResolvedValue({ count: 1 });

    await expect(
      hardDeleteOpcoPeriodConsolidation({
        opcoId: BigInt(5),
        year: 2026,
        month: 8,
      }),
    ).resolves.toBe(true);

    await expect(
      hardDeleteOpcoPeriodRevenueShareReport({
        opcoId: BigInt(5),
        year: 2026,
        month: 8,
      }),
    ).resolves.toBe(true);
  });

  it("returns zeros/false when nothing exists", async () => {
    mockedReconciliationFindMany.mockResolvedValue([]);
    mockedConsolidationFindMany.mockResolvedValue([]);
    mockedRsFindMany.mockResolvedValue([]);

    await expect(
      hardDeleteAllOpcoPeriodWork({
        opcoId: BigInt(5),
        year: 2026,
        month: 8,
      }),
    ).resolves.toEqual({
      reconciliations: 0,
      consolidation: false,
      revenueShare: false,
    });
  });
});

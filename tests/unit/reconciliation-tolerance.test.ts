import { describe, expect, it } from "vitest";

import { updateReconciliationToleranceSchema } from "@/lib/admin/validation/reconciliation-tolerance";

describe("reconciliation tolerance validation", () => {
  it("accepts valid tolerance values", () => {
    for (const value of [0, 2.5, 100]) {
      const result = updateReconciliationToleranceSchema.safeParse({
        reconciliationNegligiblePercent: value,
      });
      expect(result.success).toBe(true);
    }
  });

  it("accepts values with up to two decimal places", () => {
    const result = updateReconciliationToleranceSchema.safeParse({
      reconciliationNegligiblePercent: 2.55,
    });
    expect(result.success).toBe(true);
  });

  it("rejects negative values", () => {
    const result = updateReconciliationToleranceSchema.safeParse({
      reconciliationNegligiblePercent: -1,
    });
    expect(result.success).toBe(false);
  });

  it("rejects values above 100", () => {
    const result = updateReconciliationToleranceSchema.safeParse({
      reconciliationNegligiblePercent: 100.01,
    });
    expect(result.success).toBe(false);
  });

  it("rejects more than two decimal places", () => {
    const result = updateReconciliationToleranceSchema.safeParse({
      reconciliationNegligiblePercent: 1.234,
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-numeric values", () => {
    const result = updateReconciliationToleranceSchema.safeParse({
      reconciliationNegligiblePercent: Number.NaN,
    });
    expect(result.success).toBe(false);
  });
});

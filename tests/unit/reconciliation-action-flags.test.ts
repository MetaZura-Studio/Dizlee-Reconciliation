import { describe, expect, it } from "vitest";

import { computeActionFlags } from "@/lib/dizlee/reconciliation";

const base = {
  statusCode: "IN_PROGRESS",
  unmatchedCount: 3,
  alertedAt: new Date("2026-09-16T08:00:00.000Z"),
  reconciliationOpcoReportId: BigInt(10),
  reconciliationPartnerReportId: BigInt(20),
  latestOpcoReportId: BigInt(10),
  latestPartnerReportId: BigInt(20),
  latestOpcoReportUpdatedAt: new Date("2026-09-16T07:00:00.000Z"),
  latestPartnerReportUpdatedAt: new Date("2026-09-16T07:00:00.000Z"),
};

describe("computeActionFlags", () => {
  it("allows Confirm while in progress even with mismatches", () => {
    const flags = computeActionFlags(base);
    expect(flags.canConfirm).toBe(true);
    expect(flags.canAlert).toBe(true);
  });

  it("allows Confirm when all lines match and keeps Alert off", () => {
    const flags = computeActionFlags({
      ...base,
      unmatchedCount: 0,
      alertedAt: null,
    });
    expect(flags.canConfirm).toBe(true);
    expect(flags.canAlert).toBe(false);
  });

  it("disables Confirm when not in progress", () => {
    expect(
      computeActionFlags({
        ...base,
        statusCode: "COMPLETED",
        unmatchedCount: 0,
      }).canConfirm,
    ).toBe(false);
  });

  it("keeps Re-run disabled after alert until a report is newer", () => {
    expect(computeActionFlags(base).canRerun).toBe(false);
  });

  it("enables Re-run when Partner reuploads in place after alert", () => {
    expect(
      computeActionFlags({
        ...base,
        latestPartnerReportUpdatedAt: new Date("2026-09-16T09:00:00.000Z"),
      }).canRerun,
    ).toBe(true);
  });

  it("enables Re-run when OpCo reuploads in place after alert", () => {
    expect(
      computeActionFlags({
        ...base,
        latestOpcoReportUpdatedAt: new Date("2026-09-16T09:00:00.000Z"),
      }).canRerun,
    ).toBe(true);
  });

  it("enables Re-run when a new Partner report id appears", () => {
    expect(
      computeActionFlags({
        ...base,
        latestPartnerReportId: BigInt(21),
      }).canRerun,
    ).toBe(true);
  });

  it("does not enable Re-run before alert even if report was updated", () => {
    expect(
      computeActionFlags({
        ...base,
        alertedAt: null,
        latestPartnerReportUpdatedAt: new Date("2026-09-16T09:00:00.000Z"),
      }).canRerun,
    ).toBe(false);
  });
});

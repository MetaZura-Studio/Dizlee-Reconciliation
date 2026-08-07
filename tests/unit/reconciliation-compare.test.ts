import { describe, expect, it } from "vitest";

import {
  compareReportLines,
  withinTolerance,
} from "@/lib/dizlee/reconciliation/compare";

describe("withinTolerance", () => {
  it("treats identical amounts as matched", () => {
    expect(withinTolerance(100, 100, 1)).toBe(true);
  });

  it("allows small relative differences within tolerance", () => {
    expect(withinTolerance(100, 100.5, 1)).toBe(true);
  });

  it("flags differences outside tolerance", () => {
    expect(withinTolerance(100, 102, 1)).toBe(false);
  });
});

describe("compareReportLines", () => {
  it("matches rows within tolerance and confirms opco value on mismatch", () => {
    const rows = compareReportLines(
      [
        {
          lineId: BigInt(1),
          description: "Service A",
          lineNumber: 1,
          usageUsd: 100,
          usageAmount: null,
          amount: null,
        },
      ],
      [
        {
          lineId: BigInt(2),
          description: "Service A",
          lineNumber: 1,
          usageUsd: 100.4,
          usageAmount: null,
          amount: null,
        },
      ],
      1,
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]?.matchStatus).toBe("MATCHED");
  });

  it("marks one-sided rows as missing", () => {
    const rows = compareReportLines(
      [
        {
          lineId: BigInt(1),
          description: "Only OpCo",
          lineNumber: 1,
          usageUsd: 50,
          usageAmount: null,
          amount: null,
        },
      ],
      [],
      0,
    );

    expect(rows[0]?.matchStatus).toBe("MISSING_IN_PARTNER");
    expect(rows[0]?.confirmedValue).toBe(50);
  });

  it("compares OpCo original amount to Partner gross, not Zain share", () => {
    const rows = compareReportLines(
      [
        {
          lineId: BigInt(1),
          description: "Games",
          lineNumber: 1,
          amount: 50,
          usageUsd: 10,
          usageAmount: null,
        },
      ],
      [
        {
          lineId: BigInt(2),
          description: "Games",
          lineNumber: 1,
          amount: 50,
          usageUsd: null,
          usageAmount: null,
        },
      ],
      1,
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]?.matchStatus).toBe("MATCHED");
    expect(rows[0]?.opcoAmount).toBe(50);
    expect(rows[0]?.partnerAmount).toBe(50);
  });
});

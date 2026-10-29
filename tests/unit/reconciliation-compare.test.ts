import { describe, expect, it } from "vitest";

import {
  compareReportLines,
  normalizeServiceName,
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

describe("normalizeServiceName", () => {
  it("strips spaces so spaced and unspaced names share a key", () => {
    expect(normalizeServiceName("Raig Bait", 1)).toBe("raigbait");
    expect(normalizeServiceName("RaigBait", 2)).toBe("raigbait");
  });

  it("keeps hyphen channel suffixes as distinct keys", () => {
    expect(normalizeServiceName("FIFA Tutorials - GBOnline", 1)).toBe(
      "fifatutorials-gbonline",
    );
    expect(normalizeServiceName("FIFA Tutorials - SAOnline", 2)).toBe(
      "fifatutorials-saonline",
    );
    expect(normalizeServiceName("FIFA Tutorials - SOnline", 3)).toBe(
      "fifatutorials-sonline",
    );
    expect(normalizeServiceName("GameZilla-GBOnline", 4)).toBe(
      "gamezilla-gbonline",
    );
    expect(normalizeServiceName("GameZilla-GOnline", 5)).toBe(
      "gamezilla-gonline",
    );
  });
});

describe("compareReportLines", () => {
  it("matches rows within tolerance and confirms the lesser amount", () => {
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
    expect(rows[0]?.confirmedValue).toBe(100);
  });

  it("confirms the lesser amount on mismatch when partner is lower", () => {
    const rows = compareReportLines(
      [
        {
          lineId: BigInt(1),
          description: "Service B",
          lineNumber: 1,
          usageUsd: 120,
          usageAmount: null,
          amount: null,
        },
      ],
      [
        {
          lineId: BigInt(2),
          description: "Service B",
          lineNumber: 1,
          usageUsd: 90,
          usageAmount: null,
          amount: null,
        },
      ],
      1,
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]?.matchStatus).toBe("MISMATCHED");
    expect(rows[0]?.confirmedValue).toBe(90);
  });

  it("matches OpCo and Partner service names that differ only by spaces", () => {
    const rows = compareReportLines(
      [
        {
          lineId: BigInt(1),
          description: "Raig Bait",
          lineNumber: 1,
          usageUsd: 40,
          usageAmount: null,
          amount: null,
        },
      ],
      [
        {
          lineId: BigInt(2),
          description: "RaigBait",
          lineNumber: 1,
          usageUsd: 35,
          usageAmount: null,
          amount: null,
        },
      ],
      1,
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]?.matchStatus).toBe("MISMATCHED");
    expect(rows[0]?.confirmedValue).toBe(35);
    expect(rows[0]?.serviceCode).toBe("raigbait");
  });

  it("keeps FIFA channel suffixes as separate services", () => {
    const rows = compareReportLines(
      [
        {
          lineId: BigInt(1),
          description: "FIFA Tutorials - GBOnline",
          lineNumber: 1,
          usageUsd: 215.15,
          usageAmount: null,
          amount: null,
        },
        {
          lineId: BigInt(2),
          description: "FIFA Tutorials - SAOnline",
          lineNumber: 2,
          usageUsd: 501.86,
          usageAmount: null,
          amount: null,
        },
        {
          lineId: BigInt(3),
          description: "FIFA Tutorials - SOnline",
          lineNumber: 3,
          usageUsd: 21.12,
          usageAmount: null,
          amount: null,
        },
      ],
      [
        {
          lineId: BigInt(4),
          description: "FIFA Tutorials - GBOnline",
          lineNumber: 1,
          usageUsd: 215.15,
          usageAmount: null,
          amount: null,
        },
        {
          lineId: BigInt(5),
          description: "FIFA Tutorials - SAOnline",
          lineNumber: 2,
          usageUsd: 501.86,
          usageAmount: null,
          amount: null,
        },
        {
          lineId: BigInt(6),
          description: "FIFA Tutorials - SOnline",
          lineNumber: 3,
          usageUsd: 21.12,
          usageAmount: null,
          amount: null,
        },
      ],
      2.5,
    );

    expect(rows).toHaveLength(3);
    expect(rows.map((r) => r.description).sort()).toEqual([
      "FIFA Tutorials - GBOnline",
      "FIFA Tutorials - SAOnline",
      "FIFA Tutorials - SOnline",
    ]);
    expect(rows.every((r) => r.matchStatus === "MATCHED")).toBe(true);
  });

  it("does not match bare GameZilla to GameZilla-GBOnline", () => {
    const rows = compareReportLines(
      [
        {
          lineId: BigInt(1),
          description: "GameZilla",
          lineNumber: 1,
          usageUsd: 1040.35,
          usageAmount: null,
          amount: null,
        },
      ],
      [
        {
          lineId: BigInt(2),
          description: "GameZilla-GBOnline",
          lineNumber: 1,
          usageUsd: 294.22,
          usageAmount: null,
          amount: null,
        },
        {
          lineId: BigInt(3),
          description: "GameZilla-GOnline",
          lineNumber: 2,
          usageUsd: 39.18,
          usageAmount: null,
          amount: null,
        },
      ],
      2.5,
    );

    expect(rows).toHaveLength(3);
    expect(
      rows.find((r) => r.description === "GameZilla")?.matchStatus,
    ).toBe("MISSING_IN_PARTNER");
    expect(
      rows.find((r) => r.description === "GameZilla-GBOnline")?.matchStatus,
    ).toBe("MISSING_IN_OPCO");
    expect(
      rows.find((r) => r.description === "GameZilla-GOnline")?.matchStatus,
    ).toBe("MISSING_IN_OPCO");
  });

  it("leaves names without a hyphen unchanged", () => {
    const rows = compareReportLines(
      [
        {
          lineId: BigInt(1),
          description: "books shelf",
          lineNumber: 1,
          usageUsd: 100,
          usageAmount: null,
          amount: null,
        },
      ],
      [
        {
          lineId: BigInt(2),
          description: "books shelf",
          lineNumber: 1,
          usageUsd: 100,
          usageAmount: null,
          amount: null,
        },
      ],
      1,
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]?.serviceCode).toBe("booksshelf");
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
    expect(rows[0]?.confirmedValue).toBe(50);
  });

  it("treats partner amount as USD against OpCo USD", () => {
    const rows = compareReportLines(
      [
        {
          lineId: BigInt(1),
          description: "GamesFort",
          lineNumber: 1,
          amount: 2648.14,
          usageUsd: null,
          usageAmount: null,
        },
      ],
      [
        {
          lineId: BigInt(2),
          description: "GamesFort",
          lineNumber: 1,
          amount: 2648.14,
          usageUsd: null,
          usageAmount: null,
        },
      ],
      1,
    );

    expect(rows[0]?.matchStatus).toBe("MATCHED");
    expect(rows[0]?.opcoAmount).toBe(2648.14);
    expect(rows[0]?.partnerAmount).toBe(2648.14);
  });
});

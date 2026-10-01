import { describe, expect, it } from "vitest";

import { mergePartnerLinesByServicePrefix } from "@/lib/partner/excel/merge-lines-by-service-prefix";
import type { ParsedReportLine } from "@/lib/platform/excel/parse-report";

function line(
  partial: Partial<ParsedReportLine> & {
    lineNumber: number;
    description: string | null;
  },
): ParsedReportLine {
  return {
    usageAmount: null,
    usageUsd: null,
    amount: null,
    revenueSharePercent: null,
    exchangeRate: null,
    usageUnit: null,
    reconciliationBasis: null,
    currencyCode: null,
    sourceColumns: {},
    ...partial,
  };
}

describe("mergePartnerLinesByServicePrefix", () => {
  it("sums GameZilla hyphen variants into one GameZilla row", () => {
    const merged = mergePartnerLinesByServicePrefix([
      line({
        lineNumber: 1,
        description: "GameZilla-GBOnline",
        usageUsd: 294.22,
      }),
      line({
        lineNumber: 2,
        description: "GameZilla-GOnline",
        usageUsd: 39.18,
      }),
      line({
        lineNumber: 3,
        description: "books shelf",
        usageUsd: 10,
      }),
    ]);

    expect(merged).toHaveLength(2);
    expect(merged[0]?.lineNumber).toBe(1);
    expect(merged[0]?.description).toBe("GameZilla");
    expect(merged[0]?.usageUsd).toBeCloseTo(333.4, 2);
    expect(merged[1]).toMatchObject({
      lineNumber: 2,
      description: "books shelf",
      usageUsd: 10,
    });
  });

  it("sums FIFA Tutorials spaced-hyphen variants", () => {
    const merged = mergePartnerLinesByServicePrefix([
      line({
        lineNumber: 1,
        description: "FIFA Tutorials - GBOnline",
        amount: 215.15,
      }),
      line({
        lineNumber: 2,
        description: "FIFA Tutorials - SAOnline",
        amount: 501.86,
      }),
    ]);

    expect(merged).toHaveLength(1);
    expect(merged[0]?.description).toBe("FIFA Tutorials");
    expect(merged[0]?.amount).toBeCloseTo(717.01, 2);
  });
});

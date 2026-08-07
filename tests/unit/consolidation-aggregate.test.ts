import { describe, expect, it } from "vitest";

import {
  aggregatePartnerLines,
  lineBillableAmount,
} from "@/lib/dizlee/consolidation/aggregate";

describe("consolidation aggregate amounts", () => {
  it("prefers Original/Gross amount over Zain share (usageUsd)", () => {
    expect(
      lineBillableAmount({
        lineNumber: 1,
        description: "Games",
        amount: 50,
        usageAmount: null,
        usageUsd: 10,
        exchangeRate: null,
        usageUnit: null,
        reconciliationBasis: null,
        sourceColumns: null,
      }),
    ).toBe(50);
  });

  it("aggregates billable amounts and ignores Zain share for totals", () => {
    const rows = aggregatePartnerLines([
      {
        lineNumber: 1,
        description: "Games",
        amount: 50,
        usageAmount: null,
        usageUsd: 10,
        exchangeRate: null,
        usageUnit: null,
        reconciliationBasis: "Traditional",
        sourceColumns: { service_code: "games" },
      },
      {
        lineNumber: 2,
        description: "SMS",
        amount: 150,
        usageAmount: null,
        usageUsd: 20,
        exchangeRate: null,
        usageUnit: null,
        reconciliationBasis: "Charity",
        sourceColumns: { service_code: "sms" },
      },
    ]);

    expect(rows).toHaveLength(2);
    expect(rows.find((row) => row.serviceCode === "games")?.usageUsd).toBe(50);
    expect(rows.find((row) => row.serviceCode === "sms")?.usageUsd).toBe(150);
    expect(rows.reduce((sum, row) => sum + row.usageUsd, 0)).toBe(200);
  });
});

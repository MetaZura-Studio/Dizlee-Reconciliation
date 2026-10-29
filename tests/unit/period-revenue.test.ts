import { describe, expect, it } from "vitest";

import {
  aggregatePeriodRevenueServices,
  parsePeriodRevenueFilters,
} from "@/lib/dizlee/period-revenue.shared";

describe("parsePeriodRevenueFilters", () => {
  it("parses opco, partner, and period", () => {
    expect(
      parsePeriodRevenueFilters(
        new URLSearchParams("month=10&year=2026&opcoId=3&partnerId=7"),
      ),
    ).toEqual({
      month: 10,
      year: 2026,
      opcoId: "3",
      partnerId: "7",
    });
  });

  it("ignores non-numeric ids", () => {
    const parsed = parsePeriodRevenueFilters(
      new URLSearchParams("opcoId=abc&partnerId=7"),
    );
    expect(parsed.opcoId).toBeUndefined();
    expect(parsed.partnerId).toBe("7");
  });
});

describe("aggregatePeriodRevenueServices", () => {
  it("sums distinct services and totals with FX", () => {
    const result = aggregatePeriodRevenueServices(
      [
        { description: "FIFA Tutorials - GBOnline", amount: 100 },
        { description: "FIFA Tutorials - SOnline", amount: 50 },
        { description: "books shelf", amount: 25 },
      ],
      2,
    );

    expect(result.services).toHaveLength(3);
    expect(result.totalLc).toBe(175);
    expect(result.totalUsd).toBe(350);
    expect(
      result.services.find((s) => s.serviceName === "FIFA Tutorials - GBOnline")
        ?.grossUsd,
    ).toBe(200);
  });

  it("keeps channel suffixes as separate services", () => {
    const result = aggregatePeriodRevenueServices(
      [
        { description: "GameZilla-GBOnline", amount: 10 },
        { description: "GameZilla-GOnline", amount: 20 },
      ],
      null,
    );

    expect(result.services.map((s) => s.serviceName).sort()).toEqual([
      "GameZilla-GBOnline",
      "GameZilla-GOnline",
    ]);
    expect(result.totalLc).toBe(30);
    expect(result.totalUsd).toBeNull();
  });

  it("sums identical service names", () => {
    const result = aggregatePeriodRevenueServices(
      [
        { description: "Games", amount: 10 },
        { description: "Games", amount: 15 },
      ],
      1,
    );

    expect(result.services).toHaveLength(1);
    expect(result.services[0]?.grossLc).toBe(25);
    expect(result.totalUsd).toBe(25);
  });

  it("returns empty for no lines", () => {
    const result = aggregatePeriodRevenueServices([], 1.5);
    expect(result.services).toEqual([]);
    expect(result.totalLc).toBe(0);
    expect(result.totalUsd).toBe(0);
  });
});

import { describe, expect, it } from "vitest";

import {
  buildRevenueShareLine,
  netRevenueFromGross,
  regulatoryFeeFromVatPercent,
  resolveRevenueSharePercent,
  revenueSharePercentFromSource,
} from "@/lib/dizlee/revenue-share";
import { revenueShareExportFilename } from "@/lib/dizlee/revenue-share/export-excel";

describe("revenue share formulas", () => {
  it("reads share percent and applies OpCo tax % to gross", () => {
    expect(revenueSharePercentFromSource({ revenue_share_percent: 30 })).toBe(30);
    expect(regulatoryFeeFromVatPercent(100, 0)).toBe(0);
    expect(regulatoryFeeFromVatPercent(200, 10)).toBe(20);
    expect(netRevenueFromGross(200, 20)).toBe(180);
  });

  it("prefers the line-item field over source_columns JSON", () => {
    expect(
      resolveRevenueSharePercent({
        revenueSharePercent: 25,
        sourceColumns: { revenue_share_percent: 99 },
      }),
    ).toBe(25);
    expect(
      resolveRevenueSharePercent({
        revenueSharePercent: null,
        sourceColumns: { revenue_share_percent: 30 },
      }),
    ).toBe(30);
  });

  it("builds an export line from OpCo vatPercent and share field", () => {
    expect(
      buildRevenueShareLine({
        partnerName: "ArpuPlus",
        serviceName: "Games",
        amount: 200,
        vatPercent: 10,
        revenueSharePercent: 25,
        sourceColumns: { revenue_share_percent: 99 },
      }),
    ).toEqual({
      partnerName: "ArpuPlus",
      serviceName: "Games",
      grossAmount: 200,
      regulatoryFee: 20,
      netRevenue: 180,
      revenueSharePercent: 25,
    });
  });

  it("builds a stable download filename", () => {
    expect(revenueShareExportFilename("Zain Kuwait", 3, 2026)).toBe(
      "revenue_share_zain-kuwait_2026-03.xlsx",
    );
  });
});

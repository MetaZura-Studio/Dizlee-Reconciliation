import { describe, expect, it } from "vitest";

import {
  canSendPartnerRsReport,
  isPartnerRsPeriodExpired,
  partnerRsAmountFromGross,
  partnerRsNetAmountUsd,
  partnerRsRetentionAmount,
  partnerRsRetentionCutoff,
  partnerRsUsdFromLc,
  PARTNER_RS_RETENTION_10_PERCENT,
  PARTNER_RS_RETENTION_5_PERCENT,
  resolvePartnerRsPercentForService,
  type PartnerRsReport,
} from "@/lib/dizlee/partner-revenue-share";
import { buildPartnerRevenueSharePdf } from "@/lib/dizlee/partner-revenue-share/export-pdf";
import { partnerRsPercentSchema } from "@/lib/admin/validation/service-partner-maps";

describe("partner revenue share formulas", () => {
  it("computes Partner RS amount from gross LC × %", () => {
    expect(partnerRsAmountFromGross(1000, 30)).toBe(300);
    expect(partnerRsAmountFromGross(250.5, 0)).toBe(0);
  });

  it("converts TOTAL RS LC to USD using local-per-USD rate", () => {
    expect(partnerRsUsdFromLc(326, 3.26)).toBeCloseTo(100, 8);
    expect(partnerRsUsdFromLc(100, 0)).toBe(0);
  });

  it("applies fixed 5% and 10% retentions then net", () => {
    const usd = 100;
    expect(
      partnerRsRetentionAmount(usd, PARTNER_RS_RETENTION_5_PERCENT),
    ).toBe(5);
    expect(
      partnerRsRetentionAmount(usd, PARTNER_RS_RETENTION_10_PERCENT),
    ).toBe(10);
    expect(partnerRsNetAmountUsd(usd)).toBe(85);
  });

  it("resolves Partner RS% from matching map for the Partner", () => {
    const maps = [
      {
        serviceKey: "shofha plus",
        serviceName: "Shofha Plus",
        partnerId: BigInt(2),
        partnerRsPercent: 30,
      },
      {
        serviceKey: "other",
        serviceName: "Other",
        partnerId: BigInt(9),
        partnerRsPercent: 50,
      },
    ];
    expect(
      resolvePartnerRsPercentForService({
        serviceName: "Shofha Plus",
        partnerId: BigInt(2),
        maps,
      }),
    ).toBe(30);
    expect(
      resolvePartnerRsPercentForService({
        serviceName: "Shofha Plus",
        partnerId: BigInt(9),
        maps,
      }),
    ).toBe(0);
  });
});

describe("partner RS send gate", () => {
  it("allows send only when COMPLETED", () => {
    expect(canSendPartnerRsReport("COMPLETED")).toBe(true);
    expect(canSendPartnerRsReport("IN_PROGRESS")).toBe(false);
    expect(canSendPartnerRsReport("FAILED")).toBe(false);
  });
});

describe("partner RS percent validation", () => {
  it("accepts 0–100 with up to 2 decimals", () => {
    expect(partnerRsPercentSchema.safeParse(0).success).toBe(true);
    expect(partnerRsPercentSchema.safeParse(30.5).success).toBe(true);
    expect(partnerRsPercentSchema.safeParse(100).success).toBe(true);
    expect(partnerRsPercentSchema.safeParse(-1).success).toBe(false);
    expect(partnerRsPercentSchema.safeParse(100.01).success).toBe(false);
    expect(partnerRsPercentSchema.safeParse(1.234).success).toBe(false);
  });
});

describe("partner RS PDF export", () => {
  it("builds a PDF buffer with the report layout", async () => {
    const report: PartnerRsReport = {
      reconciliationId: 1,
      opcoId: "1",
      opcoName: "Zain KSA",
      partnerId: "2",
      partnerName: "Google",
      period: { month: 10, year: 2026, label: "10/2026" },
      currencyCode: "SAR",
      exchangeRateLocalPerUsd: 3.75999995,
      lines: [
        {
          serviceName: "Shofha Plus",
          grossRevenueLc: 1000,
          partnerRsPercent: 30,
          partnerRsAmountLc: 300,
        },
      ],
      totalGrossLc: 1000,
      totalRsLc: 300,
      totalRsUsd: 80,
      retention5Usd: 4,
      retention10Usd: 8,
      netAmountUsd: 68,
      generatedOnLabel: "20/10/2026",
    };
    const buffer = await buildPartnerRevenueSharePdf(report);
    expect(buffer.subarray(0, 4).toString("utf8")).toBe("%PDF");
    expect(Number(report.exchangeRateLocalPerUsd).toFixed(2)).toBe("3.76");
  });
});

describe("partner RS retention window", () => {
  it("computes cutoff as current month minus 3 months", () => {
    // Oct 2026 UTC → Jul 2026
    expect(partnerRsRetentionCutoff(new Date("2026-10-15T12:00:00.000Z"))).toEqual({
      month: 7,
      year: 2026,
    });
    // Jan 2026 → Oct 2025
    expect(partnerRsRetentionCutoff(new Date("2026-01-01T00:00:00.000Z"))).toEqual({
      month: 10,
      year: 2025,
    });
  });

  it("marks periods older than cutoff as expired", () => {
    const now = new Date("2026-10-15T12:00:00.000Z");
    expect(isPartnerRsPeriodExpired({ month: 6, year: 2026 }, now)).toBe(true);
    expect(isPartnerRsPeriodExpired({ month: 7, year: 2026 }, now)).toBe(false);
    expect(isPartnerRsPeriodExpired({ month: 10, year: 2026 }, now)).toBe(false);
  });
});

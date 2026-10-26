import { describe, expect, it } from "vitest";

import {
  buildPartnerRsLines,
  canSendPartnerRsReport,
  IRAQ_PARTNER_RS_REGULATORY_FEE_PERCENT,
  isIraqPartnerRsOpco,
  isPartnerRsPeriodExpired,
  partnerRsAmountFromGross,
  partnerRsAuditMessage,
  partnerRsNetAmountUsd,
  partnerRsRegulatoryFeeAmount,
  partnerRsRetentionAmount,
  partnerRsRetentionCutoff,
  partnerRsRetentionLines,
  partnerRsUsdFromLc,
  PARTNER_RS_RETENTION_10_PERCENT,
  PARTNER_RS_RETENTION_5_PERCENT,
  resolvePartnerRsPercentForService,
  type PartnerRsReport,
} from "@/lib/dizlee/partner-revenue-share";
import {
  formatPartnerRsRetentionLabel,
  parsePartnerRsRetentionOptions,
  serializePartnerRsRetentionPercentsJson,
} from "@/lib/dizlee/partner-revenue-share.shared";
import { buildPartnerRevenueSharePdf } from "@/lib/dizlee/partner-revenue-share/export-pdf";
import { partnerRsPercentSchema } from "@/lib/admin/validation/service-partner-maps";

describe("partner revenue share formulas", () => {
  it("computes Partner RS amount from gross LC × %", () => {
    expect(partnerRsAmountFromGross(1000, 30)).toBe(300);
    expect(partnerRsAmountFromGross(250.5, 0)).toBe(0);
  });

  it("applies Iraq 19.5% fee then Partner RS% on net", () => {
    expect(isIraqPartnerRsOpco("Zain Iraq")).toBe(true);
    expect(isIraqPartnerRsOpco("Zain KSA")).toBe(false);
    const fee = partnerRsRegulatoryFeeAmount(
      1000,
      IRAQ_PARTNER_RS_REGULATORY_FEE_PERCENT,
    );
    expect(fee).toBe(195);
    expect(partnerRsAmountFromGross(1000 - fee, 30)).toBe(241.5);

    const maps = [
      {
        serviceKey: "shofha plus",
        serviceName: "Shofha Plus",
        partnerId: BigInt(2),
        partnerRsPercent: 30,
      },
    ];
    const iraqLines = buildPartnerRsLines({
      lineItems: [
        {
          description: "Shofha Plus",
          amount: 1000,
          sourceColumns: {},
        },
      ],
      partnerId: BigInt(2),
      maps,
      regulatoryFeePercent: IRAQ_PARTNER_RS_REGULATORY_FEE_PERCENT,
    });
    expect(iraqLines).toHaveLength(1);
    expect(iraqLines[0]?.regulatoryFeePercent).toBe(19.5);
    expect(iraqLines[0]?.regulatoryFeeAmountLc).toBe(195);
    expect(iraqLines[0]?.partnerRsAmountLc).toBe(241.5);

    const otherLines = buildPartnerRsLines({
      lineItems: [
        {
          description: "Shofha Plus",
          amount: 1000,
          sourceColumns: {},
        },
      ],
      partnerId: BigInt(2),
      maps,
      regulatoryFeePercent: 0,
    });
    expect(otherLines[0]?.regulatoryFeePercent).toBe(0);
    expect(otherLines[0]?.partnerRsAmountLc).toBe(300);
  });

  it("converts TOTAL RS LC to USD using local-per-USD rate", () => {
    expect(partnerRsUsdFromLc(326, 3.26)).toBeCloseTo(100, 8);
    expect(partnerRsUsdFromLc(100, 0)).toBe(0);
  });

  it("applies selected retentions then net", () => {
    const usd = 100;
    expect(
      partnerRsRetentionAmount(usd, PARTNER_RS_RETENTION_5_PERCENT),
    ).toBe(5);
    expect(
      partnerRsRetentionAmount(usd, PARTNER_RS_RETENTION_10_PERCENT),
    ).toBe(10);
    expect(partnerRsNetAmountUsd(usd)).toBe(85);
    expect(
      partnerRsNetAmountUsd(usd, {
        line1: { enabled: true, percent: 5 },
        line2: { enabled: false, percent: 10 },
      }),
    ).toBe(95);
    expect(
      partnerRsNetAmountUsd(usd, {
        line1: { enabled: false, percent: 5 },
        line2: { enabled: true, percent: 10 },
      }),
    ).toBe(90);
    expect(
      partnerRsNetAmountUsd(usd, {
        line1: { enabled: false, percent: 5 },
        line2: { enabled: false, percent: 10 },
      }),
    ).toBe(100);
    expect(
      partnerRsNetAmountUsd(usd, {
        line1: { enabled: true, percent: 3 },
        line2: { enabled: false, percent: 10 },
      }),
    ).toBe(97);
    expect(
      partnerRsRetentionLines(usd, {
        line1: { enabled: true, percent: 3 },
        line2: { enabled: true, percent: 7.5 },
      }),
    ).toEqual([
      { percent: 3, amountUsd: 3 },
      { percent: 7.5, amountUsd: 7.5 },
    ]);
  });

  it("parses retention options and formats labels for audit/list", () => {
    expect(
      parsePartnerRsRetentionOptions({
        line1: { enabled: true, percent: 3 },
        line2: { enabled: false, percent: 10 },
      }),
    ).toEqual({
      line1: { enabled: true, percent: 3 },
      line2: { enabled: false, percent: 10 },
    });
    // Legacy body still accepted
    expect(
      parsePartnerRsRetentionOptions({
        includeRetention5: true,
        includeRetention10: false,
      }),
    ).toEqual({
      line1: { enabled: true, percent: 5 },
      line2: { enabled: false, percent: 10 },
    });
    expect(formatPartnerRsRetentionLabel([5, 10])).toBe("5% + 10%");
    expect(formatPartnerRsRetentionLabel([3])).toBe("3%");
    expect(formatPartnerRsRetentionLabel([])).toBe("none");
    expect(
      serializePartnerRsRetentionPercentsJson({
        line1: { enabled: true, percent: 3 },
        line2: { enabled: true, percent: 10 },
      }),
    ).toBe("[3,10]");
    expect(
      partnerRsAuditMessage({
        partnerName: "Google",
        opcoName: "Zain Bahrain",
        month: 10,
        year: 2026,
        retentionPercents: [3],
      }),
    ).toContain("with retention 3%");
    expect(
      partnerRsAuditMessage({
        partnerName: "Google",
        opcoName: "Zain Bahrain",
        month: 10,
        year: 2026,
        retentionPercents: [],
      }),
    ).toContain("with no retention");
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
          regulatoryFeePercent: 0,
          regulatoryFeeAmountLc: 0,
          partnerRsPercent: 30,
          partnerRsAmountLc: 300,
        },
      ],
      totalGrossLc: 1000,
      totalRsLc: 300,
      totalRsUsd: 80,
      retentionLines: [
        { percent: 5, amountUsd: 4 },
        { percent: 10, amountUsd: 8 },
      ],
      showRegulatoryFeeColumn: false,
      netAmountUsd: 68,
      generatedOnLabel: "20/10/2026",
    };
    const buffer = await buildPartnerRevenueSharePdf(report);
    expect(buffer.subarray(0, 4).toString("utf8")).toBe("%PDF");
    expect(Number(report.exchangeRateLocalPerUsd).toFixed(2)).toBe("3.76");
  });

  it("builds Iraq Partner RS PDF with regulatory fee column", async () => {
    const report: PartnerRsReport = {
      reconciliationId: 1,
      opcoId: "3",
      opcoName: "Zain Iraq",
      partnerId: "2",
      partnerName: "Google",
      period: { month: 10, year: 2026, label: "10/2026" },
      currencyCode: "IQD",
      exchangeRateLocalPerUsd: 1310,
      lines: [
        {
          serviceName: "Shofha Plus",
          grossRevenueLc: 1000,
          regulatoryFeePercent: 19.5,
          regulatoryFeeAmountLc: 195,
          partnerRsPercent: 30,
          partnerRsAmountLc: 241.5,
        },
      ],
      totalGrossLc: 1000,
      totalRsLc: 241.5,
      totalRsUsd: 0.18,
      retentionLines: [],
      showRegulatoryFeeColumn: true,
      netAmountUsd: 0.18,
      generatedOnLabel: "20/10/2026",
    };
    const buffer = await buildPartnerRevenueSharePdf(report);
    expect(buffer.subarray(0, 4).toString("utf8")).toBe("%PDF");
  });

  it("omits retention lines from PDF when not included", async () => {
    const base: PartnerRsReport = {
      reconciliationId: 1,
      opcoId: "1",
      opcoName: "Zain KSA",
      partnerId: "2",
      partnerName: "Google",
      period: { month: 10, year: 2026, label: "10/2026" },
      currencyCode: "SAR",
      exchangeRateLocalPerUsd: 3.76,
      lines: [
        {
          serviceName: "Shofha Plus",
          grossRevenueLc: 1000,
          regulatoryFeePercent: 0,
          regulatoryFeeAmountLc: 0,
          partnerRsPercent: 30,
          partnerRsAmountLc: 300,
        },
      ],
      totalGrossLc: 1000,
      totalRsLc: 300,
      totalRsUsd: 80,
      retentionLines: [],
      showRegulatoryFeeColumn: false,
      netAmountUsd: 80,
      generatedOnLabel: "20/10/2026",
    };
    const without = await buildPartnerRevenueSharePdf(base);
    const withCustom = await buildPartnerRevenueSharePdf({
      ...base,
      retentionLines: [
        { percent: 3, amountUsd: 2.4 },
        { percent: 10, amountUsd: 8 },
      ],
      netAmountUsd: 69.6,
    });
    expect(without.subarray(0, 4).toString("utf8")).toBe("%PDF");
    expect(withCustom.subarray(0, 4).toString("utf8")).toBe("%PDF");
    // With retentions the PDF payload is larger (extra summary lines).
    expect(withCustom.byteLength).toBeGreaterThan(without.byteLength);
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

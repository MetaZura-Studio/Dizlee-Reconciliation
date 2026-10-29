import { describe, expect, it } from "vitest";

import ExcelJS from "exceljs";

import { normalizeServiceName } from "@/lib/dizlee/reconciliation/compare";
import {
  buildRevenueShareLine,
  deriveRevenueShareDashboardStatus,
  isJordanRevenueShareOpco,
  mapRevenueShareLinesToItemCreates,
  netRevenueFromGross,
  regulatoryFeeFromPercent,
  resolveRegulatoryFeePercentForService,
  resolveRevenueShareAmount,
  resolveRevenueSharePercent,
  revenueShareAmountFromNet,
  revenueShareAmountJordan,
  revenueShareAmountUsdFromLc,
  revenueSharePercentFromSource,
  revenueShareReadinessFromPartnerRows,
  summarizeRevenueShareDashboardRows,
  type RevenueShareReport,
} from "@/lib/dizlee/revenue-share";
import {
  buildRevenueShareWorkbook,
  revenueShareExportFilename,
} from "@/lib/dizlee/revenue-share/export-excel";
import {
  EXCEL_PERCENT_NUM_FMT,
  decimalPrecisionForCurrency,
  excelMoneyNumFmt,
  formatExportMoney,
  formatExportPercent,
} from "@/lib/dizlee/revenue-share/export-format";

describe("revenue share service identity", () => {
  it("does not collapse hyphen channel suffixes into one key", () => {
    const gb = normalizeServiceName("FIFA Tutorials - GBOnline", 1);
    const sa = normalizeServiceName("FIFA Tutorials - SAOnline", 2);
    const s = normalizeServiceName("FIFA Tutorials - SOnline", 3);
    expect(gb).not.toBe(sa);
    expect(gb).not.toBe(s);
    expect(sa).not.toBe(s);
  });
});

describe("revenue share formulas", () => {
  it("reads share percent and applies service regulatory fee % to gross", () => {
    expect(revenueSharePercentFromSource({ revenue_share_percent: 30 })).toBe(30);
    expect(regulatoryFeeFromPercent(100, 0)).toBe(0);
    expect(regulatoryFeeFromPercent(200, 10)).toBe(20);
    expect(netRevenueFromGross(200, 20)).toBe(180);
  });

  it("resolves regulatory fee % from service–partner maps (0 when unmapped)", () => {
    const maps = [
      { serviceKey: "games", serviceName: "Games", regulatoryFeePercent: 6 },
      { serviceKey: "sms", serviceName: "SMS", regulatoryFeePercent: 0 },
    ];
    expect(
      resolveRegulatoryFeePercentForService({ serviceName: "Games", maps }),
    ).toBe(6);
    expect(
      resolveRegulatoryFeePercentForService({ serviceName: "SMS", maps }),
    ).toBe(0);
    expect(
      resolveRegulatoryFeePercentForService({
        serviceName: "Unknown Service",
        maps,
      }),
    ).toBe(0);
  });

  it("computes revenue share amount as Net Sales × share %", () => {
    expect(revenueShareAmountFromNet(180, 25)).toBe(45);
    expect(revenueShareAmountFromNet(100, 30)).toBe(30);
    expect(revenueShareAmountFromNet(null, 25)).toBeNull();
    expect(revenueShareAmountFromNet(180, null)).toBeNull();
    expect(revenueShareAmountFromNet(null, null)).toBeNull();
    // With fee: gross 200 @ 10% → net 180 → 180 × 25% = 45
    const net = netRevenueFromGross(200, regulatoryFeeFromPercent(200, 10));
    expect(net).toBe(180);
    expect(revenueShareAmountFromNet(net, 25)).toBe(45);
    // Zero fee: net = gross → same as old gross formula
    expect(revenueShareAmountFromNet(200, 25)).toBe(50);
  });

  it("detects Zain Jordan for share-first-then-fee RS math", () => {
    expect(isJordanRevenueShareOpco("Zain Jordan")).toBe(true);
    expect(isJordanRevenueShareOpco("zain jordan")).toBe(true);
    expect(isJordanRevenueShareOpco("Zain Iraq")).toBe(false);
    expect(isJordanRevenueShareOpco("Zain KSA")).toBe(false);
  });

  it("computes Jordan RS as (gross × RS %) then fee % off that share", () => {
    const fee = regulatoryFeeFromPercent(200, 10);
    expect(fee).toBe(20);
    // Default: net 180 × 25% = 45
    expect(revenueShareAmountFromNet(180, 25)).toBe(45);
    // Jordan: 200 × 25% = 50; 50 − 10% = 45
    expect(revenueShareAmountJordan(200, 25, 10)).toBe(45);
    expect(
      resolveRevenueShareAmount({
        opcoName: "Zain Kuwait",
        opcoAmountLocal: 200,
        netRevenue: 180,
        revenueSharePercent: 25,
        regulatoryFee: fee,
        regulatoryFeePercent: 10,
      }),
    ).toBe(45);
    expect(
      resolveRevenueShareAmount({
        opcoName: "Zain Jordan",
        opcoAmountLocal: 200,
        netRevenue: 180,
        revenueSharePercent: 25,
        regulatoryFee: fee,
        regulatoryFeePercent: 10,
      }),
    ).toBe(45);
    // Zero fee → gross × RS %
    expect(revenueShareAmountJordan(200, 25, 0)).toBe(50);
    expect(revenueShareAmountFromNet(200, 25)).toBe(50);
    expect(revenueShareAmountJordan(null, 25, 10)).toBeNull();
    expect(revenueShareAmountJordan(200, null, 10)).toBeNull();
    // First Jordan row: 8266.76 × 3% = 248.0028; minus 10% → 223.20252
    expect(revenueShareAmountJordan(8266.76, 3, 10)).toBeCloseTo(223.20252, 4);
  });

  it("converts RS LC to USD with rateToUsd", () => {
    expect(revenueShareAmountUsdFromLc(97.875, 2.65)).toBeCloseTo(259.36875, 5);
    expect(revenueShareAmountUsdFromLc(null, 2.65)).toBeNull();
    expect(revenueShareAmountUsdFromLc(100, 0)).toBeNull();
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

  it("builds an export line with fee/net/share from OpCo LC (LC-first)", () => {
    expect(
      buildRevenueShareLine({
        partnerId: "42",
        partnerName: "ArpuPlus",
        serviceName: "Games",
        opcoName: "Zain Kuwait",
        opcoAmountLocal: 1000,
        opcoAmountUsd: 200,
        partnerAmountUsd: 198,
        regulatoryFeePercent: 10,
        revenueSharePercent: 25,
        sourceColumns: { revenue_share_percent: 99 },
      }),
    ).toEqual({
      partnerId: "42",
      partnerName: "ArpuPlus",
      serviceName: "Games",
      opcoAmountLocal: 1000,
      opcoAmountUsd: 200,
      partnerAmountUsd: 198,
      regulatoryFeePercent: 10,
      regulatoryFee: 100,
      netRevenue: 900,
      revenueSharePercent: 25,
      revenueShareAmountLc: 225,
    });
  });

  it("maps lines to DB item creates with LC share and USD share", () => {
    const line = buildRevenueShareLine({
      partnerId: "7",
      partnerName: "Timwe",
      serviceName: "SMS",
      opcoName: "Zain Kuwait",
      opcoAmountLocal: 100,
      opcoAmountUsd: 20,
      partnerAmountUsd: 95,
      regulatoryFeePercent: 5,
      revenueSharePercent: 30,
    });
    const rows = mapRevenueShareLinesToItemCreates({
      revenueShareReportId: 11,
      lines: [line],
      rateToUsd: 0.2,
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      revenueShareReportId: 11,
      partnerId: BigInt(7),
      partnerName: "Timwe",
      serviceName: "SMS",
      opcoAmountUsd: 20,
      partnerAmountUsd: 95,
      regulatoryFeePercent: 5,
      regulatoryFeeAmount: 5,
      netRevenue: 95,
      revenueSharePercent: 30,
      revenueShareAmountLc: 28.5,
      revenueShareAmountUsd: 5.7,
      sortOrder: 0,
    });
  });

  it("builds a stable download filename", () => {
    expect(revenueShareExportFilename("Zain Kuwait", 3, 2026)).toBe(
      "revenue_share_zain-kuwait_2026-03.xlsx",
    );
  });

  it("exports LC net + LC share and FX share to USD columns", async () => {
    const report: RevenueShareReport = {
      opcoId: "1",
      opcoName: "Test OpCo",
      opcoCurrencyCode: "KWD",
      rateToUsd: 0.2,
      period: { month: 3, year: 2026, label: "Mar 2026" },
      lines: [
        {
          partnerId: "42",
          partnerName: "ArpuPlus",
          serviceName: "Games",
          opcoAmountLocal: 1000,
          opcoAmountUsd: 200,
          partnerAmountUsd: 198,
          regulatoryFeePercent: 10,
          regulatoryFee: 100,
          netRevenue: 900,
          revenueSharePercent: 25,
          revenueShareAmountLc: 225,
        },
        {
          partnerId: "7",
          partnerName: "Timwe",
          serviceName: "SMS",
          opcoAmountLocal: 500,
          opcoAmountUsd: 100,
          partnerAmountUsd: 95,
          regulatoryFeePercent: 0,
          regulatoryFee: 0,
          netRevenue: 500,
          revenueSharePercent: 30,
          revenueShareAmountLc: 150,
        },
      ],
    };
    const buffer = await buildRevenueShareWorkbook(report);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
    const sheet = workbook.getWorksheet("Revenue Share");
    expect(sheet).toBeTruthy();
    const headers = (sheet!.getRow(1).values as unknown[])
      .slice(1)
      .map((cell) => String(cell ?? ""));
    expect(headers).toEqual([
      "Partner Name",
      "Service Name",
      "Amount as per opco in local",
      "Amount as per opco in usd",
      "Amount as per partner in usd",
      "Regulatory Fee %",
      "Net Sales (LC)",
      "Revenue share amount (LC)",
      "Revenue share amount (USD)",
      "Revenue Share %",
    ]);
    const dataRow = sheet!.getRow(2);
    expect(dataRow.getCell(3).value).toBe(1000);
    expect(dataRow.getCell(4).value).toBe(200);
    expect(dataRow.getCell(6).value).toBe(10);
    expect(dataRow.getCell(7).value).toBe(900); // Net LC
    expect(dataRow.getCell(8).value).toBe(225); // Share LC
    expect(dataRow.getCell(9).value).toBe(45); // Share USD = 225 × 0.2
    expect(dataRow.getCell(10).value).toBe(25);
    const dataRow2 = sheet!.getRow(3);
    expect(dataRow2.getCell(6).value).toBe(0);
    expect(dataRow2.getCell(8).value).toBe(150);
    expect(dataRow2.getCell(9).value).toBe(30);
  });

  it("applies Jordan share-then-fee on LC then FX to USD in Excel", async () => {
    // LC 1000 × 3% = 30; −10% = 27 LC; × 8.26676 ≈ 223.20 USD
    const report: RevenueShareReport = {
      opcoId: "2",
      opcoName: "Zain Jordan",
      opcoCurrencyCode: "JOD",
      rateToUsd: 8.26676,
      period: { month: 3, year: 2026, label: "Mar 2026" },
      lines: [
        {
          partnerId: "42",
          partnerName: "ArpuPlus",
          serviceName: "Games",
          opcoAmountLocal: 1000,
          opcoAmountUsd: 8266.76,
          partnerAmountUsd: 198,
          regulatoryFeePercent: 10,
          regulatoryFee: 100,
          netRevenue: 900,
          revenueSharePercent: 3,
          revenueShareAmountLc: 27,
        },
      ],
    };
    const buffer = await buildRevenueShareWorkbook(report);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
    const sheet = workbook.getWorksheet("Revenue Share");
    expect(sheet).toBeTruthy();
    expect(sheet!.getRow(2).getCell(8).value).toBe(27);
    expect(sheet!.getRow(2).getCell(9).value).toBe(223.2);
  });

  it("formats export money with currency decimals and thousand separators", () => {
    expect(decimalPrecisionForCurrency("USD")).toBe(2);
    expect(decimalPrecisionForCurrency("KWD")).toBe(3);
    expect(decimalPrecisionForCurrency("BHD")).toBe(3);
    expect(excelMoneyNumFmt("USD")).toBe("#,##0.##");
    expect(excelMoneyNumFmt("IQD")).toBe("#,##0.###");
    expect(EXCEL_PERCENT_NUM_FMT).toBe('0.##"%"');
    expect(formatExportMoney(367567.8, "USD")).toBe("367,567.8");
    expect(formatExportMoney(890400, "IQD")).toBe("890,400");
    expect(formatExportMoney(1234.5678, "KWD")).toBe("1,234.568");
    expect(formatExportMoney(null, "USD")).toBe("");
  });

  it("formats export percents with a % sign", () => {
    expect(formatExportPercent(19.5)).toBe("19.5%");
    expect(formatExportPercent(30)).toBe("30%");
    expect(formatExportPercent(null)).toBe("");
  });
});

describe("revenueShareReadinessFromPartnerRows", () => {
  it("omits linked partners with no OpCo report and stays ready when Partner reports are missing", () => {
    const result = revenueShareReadinessFromPartnerRows(
      [
        {
          partnerId: "1",
          partnerName: "In File",
          hasOpcoReport: true,
          hasPartnerReport: false,
          opcoLineItemCount: 3,
          partnerLineItemCount: 0,
        },
        {
          partnerId: "2",
          partnerName: "Linked Only",
          hasOpcoReport: false,
          hasPartnerReport: true,
          opcoLineItemCount: 0,
          partnerLineItemCount: 2,
        },
      ],
      2,
    );

    expect(result.linkedCount).toBe(2);
    expect(result.partners).toEqual([
      expect.objectContaining({ partnerId: "1", partnerName: "In File" }),
    ]);
    expect(result.missing).toEqual(["In File (Partner report)"]);
    expect(result.ready).toBe(true);
  });

  it("is ready when every OpCo-submitted partner also has a Partner report", () => {
    const result = revenueShareReadinessFromPartnerRows(
      [
        {
          partnerId: "1",
          partnerName: "In File",
          hasOpcoReport: true,
          hasPartnerReport: true,
          opcoLineItemCount: 3,
          partnerLineItemCount: 2,
        },
        {
          partnerId: "2",
          partnerName: "Linked Only",
          hasOpcoReport: false,
          hasPartnerReport: false,
          opcoLineItemCount: 0,
          partnerLineItemCount: 0,
        },
      ],
      2,
    );

    expect(result.partners).toHaveLength(1);
    expect(result.missing).toEqual([]);
    expect(result.ready).toBe(true);
  });
});

describe("deriveRevenueShareDashboardStatus", () => {
  it("prefers Generated when a stored report exists", () => {
    expect(
      deriveRevenueShareDashboardStatus({
        hasGeneratedReport: true,
        submittedPartnerCount: 2,
        hasMissingPartnerReports: true,
      }),
    ).toBe("GENERATED");
  });

  it("marks OpCo report missing when nothing was submitted", () => {
    expect(
      deriveRevenueShareDashboardStatus({
        hasGeneratedReport: false,
        submittedPartnerCount: 0,
      }),
    ).toBe("OPCO_REPORT_MISSING");
  });

  it("soft-marks partners missing when OpCo is in but some Partner reports are not", () => {
    expect(
      deriveRevenueShareDashboardStatus({
        hasGeneratedReport: false,
        submittedPartnerCount: 3,
        hasMissingPartnerReports: true,
      }),
    ).toBe("PARTNERS_REPORT_MISSING");
  });

  it("is Ready when OpCo submissions are in and all Partner reports are present", () => {
    expect(
      deriveRevenueShareDashboardStatus({
        hasGeneratedReport: false,
        submittedPartnerCount: 2,
        hasMissingPartnerReports: false,
      }),
    ).toBe("READY");
  });
});

describe("summarizeRevenueShareDashboardRows", () => {
  it("counts ready, pending, and generated", () => {
    expect(
      summarizeRevenueShareDashboardRows([
        { status: "READY" },
        { status: "GENERATED" },
        { status: "OPCO_REPORT_MISSING" },
        { status: "PARTNERS_REPORT_MISSING" },
      ]),
    ).toEqual({
      total: 4,
      ready: 1,
      pendingMissing: 2,
      generated: 1,
    });
  });
});

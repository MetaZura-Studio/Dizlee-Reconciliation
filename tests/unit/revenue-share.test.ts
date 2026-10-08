import { describe, expect, it } from "vitest";

import ExcelJS from "exceljs";

import {
  buildRevenueShareLine,
  deriveRevenueShareDashboardStatus,
  mapRevenueShareLinesToItemCreates,
  netRevenueFromGross,
  regulatoryFeeFromVatPercent,
  resolveRevenueSharePercent,
  revenueShareAmountFromOpco,
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
  decimalPrecisionForCurrency,
  formatExportMoney,
  formatExportPercent,
} from "@/lib/dizlee/revenue-share/export-format";

describe("revenue share formulas", () => {
  it("reads share percent and applies OpCo tax % to gross", () => {
    expect(revenueSharePercentFromSource({ revenue_share_percent: 30 })).toBe(30);
    expect(regulatoryFeeFromVatPercent(100, 0)).toBe(0);
    expect(regulatoryFeeFromVatPercent(200, 10)).toBe(20);
    expect(netRevenueFromGross(200, 20)).toBe(180);
  });

  it("computes revenue share amount as OpCo USD × share %", () => {
    expect(revenueShareAmountFromOpco(200, 25)).toBe(50);
    expect(revenueShareAmountFromOpco(100, 30)).toBe(30);
    expect(revenueShareAmountFromOpco(null, 25)).toBeNull();
    expect(revenueShareAmountFromOpco(200, null)).toBeNull();
    expect(revenueShareAmountFromOpco(null, null)).toBeNull();
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

  it("builds an export line from OpCo USD, Partner USD, and OpCo fee %", () => {
    expect(
      buildRevenueShareLine({
        partnerId: "42",
        partnerName: "ArpuPlus",
        serviceName: "Games",
        opcoAmountUsd: 200,
        partnerAmountUsd: 198,
        vatPercent: 10,
        revenueSharePercent: 25,
        sourceColumns: { revenue_share_percent: 99 },
      }),
    ).toEqual({
      partnerId: "42",
      partnerName: "ArpuPlus",
      serviceName: "Games",
      opcoAmountUsd: 200,
      partnerAmountUsd: 198,
      regulatoryFee: 20,
      netRevenue: 180,
      revenueSharePercent: 25,
    });
  });

  it("maps lines to DB item creates with sort order and fee percent", () => {
    const line = buildRevenueShareLine({
      partnerId: "7",
      partnerName: "Timwe",
      serviceName: "SMS",
      opcoAmountUsd: 100,
      partnerAmountUsd: 95,
      vatPercent: 5,
      revenueSharePercent: 30,
    });
    const rows = mapRevenueShareLinesToItemCreates({
      revenueShareReportId: 11,
      regulatoryFeePercent: 5,
      lines: [line],
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      revenueShareReportId: 11,
      partnerId: BigInt(7),
      partnerName: "Timwe",
      serviceName: "SMS",
      opcoAmountUsd: 100,
      partnerAmountUsd: 95,
      regulatoryFeePercent: 5,
      regulatoryFeeAmount: 5,
      netRevenue: 95,
      revenueSharePercent: 30,
      sortOrder: 0,
    });
  });

  it("builds a stable download filename", () => {
    expect(revenueShareExportFilename("Zain Kuwait", 3, 2026)).toBe(
      "revenue_share_zain-kuwait_2026-03.xlsx",
    );
  });

  it("puts Revenue share amount before Revenue Share % in the Excel", async () => {
    const report: RevenueShareReport = {
      opcoId: "1",
      opcoName: "Test OpCo",
      vatPercent: 10,
      period: { month: 3, year: 2026, label: "Mar 2026" },
      lines: [
        {
          partnerId: "42",
          partnerName: "ArpuPlus",
          serviceName: "Games",
          opcoAmountUsd: 200,
          partnerAmountUsd: 198,
          regulatoryFee: 20,
          netRevenue: 180,
          revenueSharePercent: 25,
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
      "Amount as per opco in usd",
      "Amount as per partner in usd",
      "Regulatory Fee %",
      "Net Revenue",
      "Revenue share amount",
      "Revenue Share %",
    ]);
    const row = (sheet!.getRow(2).values as unknown[]).slice(1).map((cell) =>
      String(cell ?? ""),
    );
    expect(row[6]).toBe("50.00");
    expect(row[7]).toBe("25%");
  });

  it("formats export money with currency decimals and thousand separators", () => {
    expect(decimalPrecisionForCurrency("USD")).toBe(2);
    expect(decimalPrecisionForCurrency("KWD")).toBe(3);
    expect(decimalPrecisionForCurrency("BHD")).toBe(3);
    expect(formatExportMoney(367567.8, "USD")).toBe("367,567.80");
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

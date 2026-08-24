/**
 * Excel builder for the Dizlee Revenue Share Report.
 */

import ExcelJS from "exceljs";

import type { RevenueShareReport } from "@/lib/dizlee/revenue-share";
import {
  formatExportMoney,
  formatExportPercent,
} from "@/lib/dizlee/revenue-share/export-format";
import { BASE_CURRENCY_ISO_CODE } from "@/lib/platform/currency-rates";

export function revenueShareExportFilename(
  opcoName: string,
  month: number,
  year: number,
): string {
  const slug = opcoName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const period = `${year}-${String(month).padStart(2, "0")}`;
  return `revenue_share_${slug || "opco"}_${period}.xlsx`;
}

export async function buildRevenueShareWorkbook(
  report: RevenueShareReport,
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Revenue Share");
  const moneyIso = BASE_CURRENCY_ISO_CODE;

  sheet.addRow([
    "Partner Name",
    "Service Name",
    "Amount given by OpCo in USD",
    "Amount given by Partner in USD",
    "Regulatory Fee %",
    "Net Revenue",
    "Revenue Share %",
  ]);
  sheet.getRow(1).font = { bold: true };

  for (const line of report.lines) {
    sheet.addRow([
      line.partnerName,
      line.serviceName,
      formatExportMoney(line.opcoAmountUsd, moneyIso),
      formatExportMoney(line.partnerAmountUsd, moneyIso),
      formatExportPercent(report.vatPercent),
      formatExportMoney(line.netRevenue, moneyIso),
      formatExportPercent(line.revenueSharePercent),
    ]);
  }

  sheet.columns = [
    { width: 28 },
    { width: 36 },
    { width: 32 },
    { width: 36 },
    { width: 18 },
    { width: 16 },
    { width: 18 },
  ];

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

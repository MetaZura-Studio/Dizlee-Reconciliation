/**
 * Excel builder for the Dizlee Revenue Share Report.
 */

import ExcelJS from "exceljs";

import type { RevenueShareReport } from "@/lib/dizlee/revenue-share";

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

  sheet.addRow(["OpCo", report.opcoName]);
  sheet.addRow(["Period", report.period.label]);
  sheet.addRow(["Regulatory fee %", report.vatPercent]);
  sheet.addRow([
    "Formulas",
    "Gross = OpCo line amount; Regulatory Fee = Gross × OpCo tax %; Net = Gross − Fee; Share % = mapped OpCo column",
  ]);
  sheet.addRow([]);

  sheet.addRow([
    "Partner Name",
    "Service Name",
    "Gross Amount",
    "Regulatory Fee",
    "Net Revenue",
    "Revenue Share %",
  ]);
  if (sheet.lastRow) {
    sheet.lastRow.font = { bold: true };
  }

  for (const line of report.lines) {
    sheet.addRow([
      line.partnerName,
      line.serviceName,
      line.grossAmount,
      line.regulatoryFee,
      line.netRevenue,
      line.revenueSharePercent,
    ]);
  }

  sheet.columns = [
    { width: 28 },
    { width: 36 },
    { width: 16 },
    { width: 16 },
    { width: 16 },
    { width: 18 },
  ];

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

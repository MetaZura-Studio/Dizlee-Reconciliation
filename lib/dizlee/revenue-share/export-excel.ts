/**
 * Excel builder for the Dizlee Revenue Share Report (LC-first share math).
 */

import ExcelJS from "exceljs";

import {
  revenueShareAmountUsdFromLc,
  type RevenueShareReport,
} from "@/lib/dizlee/revenue-share";
import {
  EXCEL_PERCENT_NUM_FMT,
  excelMoneyNumFmt,
  exportMoneyNumber,
  exportPercentNumber,
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

function setNumericCell(
  cell: ExcelJS.Cell,
  value: number | null,
  numFmt: string,
) {
  if (value === null) {
    cell.value = null;
    return;
  }
  cell.value = value;
  cell.numFmt = numFmt;
}

export async function buildRevenueShareWorkbook(
  report: RevenueShareReport,
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Revenue Share");
  const moneyIso = BASE_CURRENCY_ISO_CODE;
  const localFmt = excelMoneyNumFmt(report.opcoCurrencyCode);
  const usdFmt = excelMoneyNumFmt(moneyIso);

  sheet.addRow([
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
  sheet.getRow(1).font = { bold: true };

  for (const line of report.lines) {
    const row = sheet.addRow([
      line.partnerName,
      line.serviceName,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
    ]);

    const shareLc = line.revenueShareAmountLc;
    const shareUsd = revenueShareAmountUsdFromLc(shareLc, report.rateToUsd);

    setNumericCell(
      row.getCell(3),
      exportMoneyNumber(line.opcoAmountLocal, report.opcoCurrencyCode),
      localFmt,
    );
    setNumericCell(
      row.getCell(4),
      exportMoneyNumber(line.opcoAmountUsd, moneyIso),
      usdFmt,
    );
    setNumericCell(
      row.getCell(5),
      exportMoneyNumber(line.partnerAmountUsd, moneyIso),
      usdFmt,
    );
    setNumericCell(
      row.getCell(6),
      exportPercentNumber(line.regulatoryFeePercent),
      EXCEL_PERCENT_NUM_FMT,
    );
    setNumericCell(
      row.getCell(7),
      exportMoneyNumber(line.netRevenue, report.opcoCurrencyCode),
      localFmt,
    );
    setNumericCell(
      row.getCell(8),
      exportMoneyNumber(shareLc, report.opcoCurrencyCode),
      localFmt,
    );
    setNumericCell(
      row.getCell(9),
      exportMoneyNumber(shareUsd, moneyIso),
      usdFmt,
    );
    setNumericCell(
      row.getCell(10),
      exportPercentNumber(line.revenueSharePercent),
      EXCEL_PERCENT_NUM_FMT,
    );
  }

  sheet.columns = [
    { width: 28 },
    { width: 36 },
    { width: 32 },
    { width: 32 },
    { width: 36 },
    { width: 18 },
    { width: 16 },
    { width: 28 },
    { width: 30 },
    { width: 18 },
  ];

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

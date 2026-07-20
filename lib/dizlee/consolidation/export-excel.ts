import ExcelJS from "exceljs";

import type { ConsolidationDetail } from "@/lib/dizlee/consolidation";

export function consolidationExportFilename(
  opcoId: string,
  month: number,
  year: number,
): string {
  const period = `${year}-${String(month).padStart(2, "0")}`;
  return `opco_consolidated_${opcoId}_${period}.xlsx`;
}

export async function buildConsolidationWorkbook(
  detail: ConsolidationDetail,
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Consolidation");

  sheet.addRow(["OpCo", detail.opcoName]);
  sheet.addRow(["Period", detail.period.label]);
  sheet.addRow(["Generated at", detail.generatedAt]);
  sheet.addRow(["Total KWD", detail.totalAmountUsd ?? 0]);
  sheet.addRow([]);

  sheet.addRow([
    "Partner",
    "Service code",
    "Description",
    "Usage amount",
    "Usage unit",
    "Usage KWD",
    "Exchange rate",
    "Revenue basis",
  ]);

  const headerRow = sheet.lastRow;
  if (headerRow) {
    headerRow.font = { bold: true };
  }

  for (const item of detail.items) {
    sheet.addRow([
      item.partnerName,
      item.serviceCode,
      item.description,
      item.usageAmount,
      item.usageUnit ?? "",
      item.usageUsd,
      item.exchangeRate ?? "",
      item.revenueBasis ?? "",
    ]);
  }

  sheet.columns = [
    { width: 24 },
    { width: 20 },
    { width: 32 },
    { width: 16 },
    { width: 12 },
    { width: 14 },
    { width: 14 },
    { width: 18 },
  ];

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

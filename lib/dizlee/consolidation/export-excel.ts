/**
 * Excel export builder for generated OpCo consolidation workbooks.
 * Consumed by consolidation download actions; filenames are deterministic per OpCo and period.
 */

import ExcelJS from "exceljs";

import type { ConsolidationDetail } from "@/lib/dizlee/consolidation";

function itemAmount(item: ConsolidationDetail["items"][number]): number {
  return item.usageUsd ?? item.usageAmount ?? 0;
}

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

  const overallTotal =
    detail.totalAmountUsd ??
    detail.items.reduce((sum, item) => sum + itemAmount(item), 0);

  sheet.addRow(["OpCo", detail.opcoName]);
  sheet.addRow(["Period", detail.period.label]);
  sheet.addRow(["Generated at", detail.generatedAt]);
  sheet.addRow(["Overall total (USD)", overallTotal]);
  sheet.addRow([]);

  sheet.addRow([
    "Partner",
    "Service code",
    "Description",
    "Amount (USD)",
    "Revenue basis",
  ]);

  const headerRow = sheet.lastRow;
  if (headerRow) {
    headerRow.font = { bold: true };
  }

  let index = 0;
  while (index < detail.items.length) {
    const partnerName = detail.items[index]?.partnerName ?? "Partner";
    const group: ConsolidationDetail["items"] = [];
    while (
      index < detail.items.length &&
      detail.items[index]?.partnerName === partnerName
    ) {
      group.push(detail.items[index]!);
      index += 1;
    }

    for (const item of group) {
      sheet.addRow([
        item.partnerName,
        item.serviceCode,
        item.description,
        itemAmount(item),
        item.revenueBasis ?? "",
      ]);
    }

    const partnerTotal = group.reduce((sum, item) => sum + itemAmount(item), 0);
    const totalRow = sheet.addRow([
      `${partnerName} — ${detail.period.label} total`,
      "",
      "",
      partnerTotal,
      "",
    ]);
    totalRow.font = { bold: true };
  }

  sheet.columns = [
    { width: 28 },
    { width: 20 },
    { width: 32 },
    { width: 16 },
    { width: 18 },
  ];

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

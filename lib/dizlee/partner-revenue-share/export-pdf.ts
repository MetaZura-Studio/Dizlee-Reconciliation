/**
 * PDF builder for Dizlee → Partner Revenue Share Report (same layout as prior Excel).
 */

import PDFDocument from "pdfkit";

import type { PartnerRsReport } from "@/lib/dizlee/partner-revenue-share";
import {
  PARTNER_RS_RETENTION_10_PERCENT,
  PARTNER_RS_RETENTION_5_PERCENT,
} from "@/lib/dizlee/partner-revenue-share";
import {
  formatExportMoney,
  formatExportPercent,
} from "@/lib/dizlee/revenue-share/export-format";
import { BASE_CURRENCY_ISO_CODE } from "@/lib/platform/currency-rates";
import { formatAppMonthYear } from "@/lib/platform/format-datetime";

export function partnerRevenueShareExportFilename(
  partnerName: string,
  opcoName: string,
  month: number,
  year: number,
): string {
  const slug = (value: string) =>
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  const period = `${year}-${String(month).padStart(2, "0")}`;
  return `partner_rs_${slug(partnerName) || "partner"}_${slug(opcoName) || "opco"}_${period}.pdf`;
}

function collectPdfBuffer(doc: PDFKit.PDFDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
    });
    doc.on("end", () => {
      resolve(Buffer.concat(chunks));
    });
    doc.on("error", reject);
  });
}

type Col = { x: number; width: number; align?: "left" | "right" | "center" };

function drawRow(
  doc: PDFKit.PDFDocument,
  y: number,
  cols: Col[],
  cells: string[],
  options?: { bold?: boolean; fill?: string; height?: number },
): number {
  const rowHeight = options?.height ?? 22;
  const pageBottom = doc.page.height - doc.page.margins.bottom;
  if (y + rowHeight > pageBottom) {
    doc.addPage();
    doc.save();
    doc.rect(0, 0, doc.page.width, doc.page.height).fill("#FFFFFF");
    doc.restore();
    y = doc.page.margins.top;
  }

  if (options?.fill) {
    const totalWidth = cols.reduce((sum, col) => sum + col.width, 0);
    doc.save();
    doc.rect(cols[0]!.x, y, totalWidth, rowHeight).fill(options.fill);
    doc.restore();
  }

  doc.save();
  doc
    .font(options?.bold ? "Helvetica-Bold" : "Helvetica")
    .fontSize(9)
    .fillColor("#111111");

  cells.forEach((text, index) => {
    const col = cols[index];
    if (!col) {
      return;
    }
    doc.text(text, col.x + 4, y + 6, {
      width: col.width - 8,
      align: col.align ?? "left",
      lineBreak: false,
      ellipsis: true,
    });
  });
  doc.restore();

  const totalWidth = cols.reduce((sum, col) => sum + col.width, 0);
  doc
    .strokeColor("#CCCCCC")
    .lineWidth(0.5)
    .rect(cols[0]!.x, y, totalWidth, rowHeight)
    .stroke();

  return y + rowHeight;
}

/** Renders Partner RS report PDF matching the Dizlee-to-Partner template layout. */
export async function buildPartnerRevenueSharePdf(
  report: PartnerRsReport,
): Promise<Buffer> {
  const doc = new PDFDocument({
    margin: 48,
    size: "A4",
    info: {
      Title: "Partner Revenue share Report",
      Author: "Dizlee Communications Company",
    },
  });
  const done = collectPdfBuffer(doc);

  const moneyLc = report.currencyCode;
  const moneyUsd = BASE_CURRENCY_ISO_CODE;
  const periodLabel = formatAppMonthYear(report.period.month, report.period.year);
  const left = doc.page.margins.left;
  const contentWidth =
    doc.page.width - doc.page.margins.left - doc.page.margins.right;

  // Opaque white page so viewers never show a dark canvas behind content.
  doc.save();
  doc.rect(0, 0, doc.page.width, doc.page.height).fill("#FFFFFF");
  doc.restore();
  doc.y = doc.page.margins.top;

  doc.font("Helvetica-Bold").fontSize(16).fillColor("#111111");
  doc.text("Dizlee Communications Company", left, doc.y, { width: contentWidth });
  doc.moveDown(0.35);
  doc.font("Helvetica").fontSize(12);
  doc.text(`Partner Revenue share Report - ${periodLabel}`, {
    width: contentWidth,
  });
  doc.moveDown(0.8);
  doc.fontSize(10).fillColor("#333333");
  doc.text(`Partner Name: ${report.partnerName}`);
  doc.text(`OpCo Name: ${report.opcoName}`);
  doc.text(`Generated on: ${report.generatedOnLabel}`);
  doc.moveDown(0.9);

  const cols: Col[] = [
    { x: left, width: 42, align: "center" },
    { x: left + 42, width: 170, align: "left" },
    { x: left + 212, width: 110, align: "right" },
    { x: left + 322, width: 70, align: "right" },
    { x: left + 392, width: 110, align: "right" },
  ];

  let y = doc.y;
  y = drawRow(
    doc,
    y,
    cols,
    [
      "Sr. No",
      "Service Names",
      "Gross Revenue (LC)",
      "Partner RS%",
      "Partner RS Amount",
    ],
    { bold: true, fill: "#F3F4F6" },
  );

  report.lines.forEach((line, index) => {
    y = drawRow(doc, y, cols, [
      String(index + 1),
      line.serviceName,
      formatExportMoney(line.grossRevenueLc, moneyLc),
      formatExportPercent(line.partnerRsPercent),
      formatExportMoney(line.partnerRsAmountLc, moneyLc),
    ]);
  });

  y = drawRow(
    doc,
    y,
    cols,
    [
      "",
      "Total",
      formatExportMoney(report.totalGrossLc, moneyLc),
      "",
      formatExportMoney(report.totalRsLc, moneyLc),
    ],
    { bold: true, fill: "#F9FAFB" },
  );

  doc.y = y + 14;
  doc.font("Helvetica").fontSize(9).fillColor("#555555");
  doc.text(
    "Note: Partner RS% is configured by Admin on Service–Partner maps for this OpCo.",
    left,
    doc.y,
    { width: contentWidth },
  );
  doc.moveDown(1);

  const summaryLeft = left;
  const summaryLabelWidth = 220;
  const summaryValueWidth = 160;
  const formatUsd2 = (value: number) =>
    formatExportMoney(Number(value.toFixed(2)), moneyUsd);
  const summaryRows: Array<[string, string]> = [
    ["TOTAL RS (LC)", formatExportMoney(report.totalRsLc, moneyLc)],
    ["TOTAL RS (USD)", formatUsd2(report.totalRsUsd)],
    [
      "Exchange rate (1 USD = local)",
      Number(report.exchangeRateLocalPerUsd).toFixed(2),
    ],
    [
      `Retention ${PARTNER_RS_RETENTION_5_PERCENT}% (USD)`,
      formatUsd2(report.retention5Usd),
    ],
    [
      `Retention ${PARTNER_RS_RETENTION_10_PERCENT}% (USD)`,
      formatUsd2(report.retention10Usd),
    ],
    ["Net amount to Partner (USD)", formatUsd2(report.netAmountUsd)],
  ];

  summaryRows.forEach(([label, value], index) => {
    const bold = index === summaryRows.length - 1;
    const rowY = doc.y;
    if (rowY + 18 > doc.page.height - doc.page.margins.bottom) {
      doc.addPage();
      doc.save();
      doc.rect(0, 0, doc.page.width, doc.page.height).fill("#FFFFFF");
      doc.restore();
    }
    doc
      .font(bold ? "Helvetica-Bold" : "Helvetica")
      .fontSize(10)
      .fillColor("#111111");
    doc.text(label, summaryLeft, doc.y, {
      width: summaryLabelWidth,
      continued: false,
    });
    const valueY = doc.y - 12;
    doc.text(value, summaryLeft + summaryLabelWidth, valueY, {
      width: summaryValueWidth,
      align: "right",
    });
    doc.moveDown(0.35);
  });

  doc.end();
  return done;
}

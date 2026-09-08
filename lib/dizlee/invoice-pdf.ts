/**
 * Build a simple Dizlee → OpCo invoice PDF for email/outbox attachment.
 */

import PDFDocument from "pdfkit";

import { formatMoney } from "@/lib/platform/format-money";

export type InvoicePdfLineItem = {
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type InvoicePdfInput = {
  invoiceNumber: string;
  periodLabel: string;
  opcoName: string;
  currencyCode: string;
  totalAmount: number;
  preparedBy?: string | null;
  approvedBy?: string | null;
  bankName?: string | null;
  accountName?: string | null;
  accountNumber?: string | null;
  iban?: string | null;
  lineItems: InvoicePdfLineItem[];
};

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

/** Renders a compact invoice PDF suitable for email attachment. */
export async function buildOpcoInvoicePdf(
  input: InvoicePdfInput,
): Promise<Buffer> {
  const doc = new PDFDocument({ margin: 50, size: "A4" });
  const done = collectPdfBuffer(doc);

  doc.fontSize(18).text("Invoice", { align: "left" });
  doc.moveDown(0.5);
  doc.fontSize(11).fillColor("#333333");
  doc.text(`Invoice number: ${input.invoiceNumber}`);
  doc.text(`Period: ${input.periodLabel}`);
  doc.text(`Bill to: ${input.opcoName}`);
  doc.text(`Currency: ${input.currencyCode}`);
  doc.moveDown();

  doc.fontSize(12).fillColor("#111111").text("Line items");
  doc.moveDown(0.4);
  doc.fontSize(10).fillColor("#333333");

  for (const [index, line] of input.lineItems.entries()) {
    doc.text(
      `${index + 1}. ${line.description} — Qty ${line.quantity} × ${formatMoney(line.unitPrice, input.currencyCode)} = ${formatMoney(line.lineTotal, input.currencyCode)}`,
    );
  }

  doc.moveDown();
  doc.fontSize(12).fillColor("#111111");
  doc.text(
    `Total: ${formatMoney(input.totalAmount, input.currencyCode)}`,
    { underline: true },
  );

  if (input.bankName || input.accountName || input.iban || input.accountNumber) {
    doc.moveDown();
    doc.fontSize(12).text("Bank details");
    doc.fontSize(10).fillColor("#333333");
    if (input.bankName) {
      doc.text(`Bank: ${input.bankName}`);
    }
    if (input.accountName) {
      doc.text(`Account name: ${input.accountName}`);
    }
    if (input.accountNumber) {
      doc.text(`Account number: ${input.accountNumber}`);
    }
    if (input.iban) {
      doc.text(`IBAN: ${input.iban}`);
    }
  }

  if (input.preparedBy || input.approvedBy) {
    doc.moveDown();
    doc.fontSize(10);
    if (input.preparedBy) {
      doc.text(`Prepared by: ${input.preparedBy}`);
    }
    if (input.approvedBy) {
      doc.text(`Approved by: ${input.approvedBy}`);
    }
  }

  doc.end();
  return done;
}

"use client";

import { DizleeOpcoInvoicePrintView } from "@/components/shared/dizlee-opco-invoice-print-view";
import type { OpcoInvoiceDetail } from "@/lib/opco/queries/invoices";

type InvoicePrintViewProps = {
  detail: OpcoInvoiceDetail;
};

export function InvoicePrintView({ detail }: InvoicePrintViewProps) {
  return (
    <DizleeOpcoInvoicePrintView
      backHref="/opco/invoices"
      backLabel="Back to invoices"
      invoiceNumber={detail.invoiceNumber ?? `Invoice #${detail.id}`}
      issuedAt={detail.issuedAt}
      billedPartyName={detail.opcoName}
      currencyCode={detail.currencyCode}
      lineItems={detail.lineItems}
      bankDetails={detail.bankDetails}
      preparedBy={detail.preparedBy}
      approvedBy={detail.approvedBy}
    />
  );
}

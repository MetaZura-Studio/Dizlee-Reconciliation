import { notFound } from "next/navigation";

import { DizleeOpcoInvoicePrintView } from "@/components/shared/dizlee-opco-invoice-print-view";
import { requireDizleeSession } from "@/lib/dizlee/auth";
import { getInvoiceDetail } from "@/lib/dizlee/invoices";

type DizleeInvoicePrintPageProps = {
  params: Promise<{ id: string }>;
};

export default async function DizleeInvoicePrintPage({
  params,
}: DizleeInvoicePrintPageProps) {
  await requireDizleeSession();
  const { id } = await params;

  if (!/^\d+$/.test(id)) {
    notFound();
  }

  const detail = await getInvoiceDetail(id);

  if (!detail || !detail.isDigital || detail.invoiceTypeCode !== "CLIENT_TO_OPCO") {
    notFound();
  }

  return (
    <DizleeOpcoInvoicePrintView
      backHref="/dizlee/invoices"
      backLabel="Back to invoices"
      invoiceNumber={detail.invoiceNumber ?? `Invoice #${detail.id}`}
      issuedAt={detail.uploadedAt}
      billedPartyName={detail.opcoName}
      currencyCode={detail.currencyCode}
      lineItems={detail.lineItems}
      bankDetails={detail.bankDetails}
      preparedBy={detail.preparedBy}
      approvedBy={detail.approvedBy}
    />
  );
}

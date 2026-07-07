import { notFound } from "next/navigation";

import { InvoicePrintView } from "@/components/opco/InvoicePrintView";
import { requireOpcoSession } from "@/lib/opco/auth";
import { getOpcoInvoiceDetailForOpco } from "@/lib/opco/queries/invoices";

type InvoicePrintPageProps = {
  params: Promise<{ id: string }>;
};

export default async function InvoicePrintPage({ params }: InvoicePrintPageProps) {
  const session = await requireOpcoSession();
  const { id } = await params;

  if (!/^\d+$/.test(id)) {
    notFound();
  }

  const detail = await getOpcoInvoiceDetailForOpco(BigInt(session.opcoId), BigInt(id));

  if (!detail) {
    notFound();
  }

  return <InvoicePrintView detail={detail} />;
}

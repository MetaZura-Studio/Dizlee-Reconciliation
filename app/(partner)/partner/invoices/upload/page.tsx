import Link from "next/link";

import { InvoiceUploadForm } from "@/components/partner/InvoiceUploadForm";
import { PageCard, PageHeader } from "@/components/ui/page";
import { requirePartnerSession } from "@/lib/partner/auth";
import { getLinkedOpcosForPartner } from "@/lib/partner/queries/opcos";

export default async function PartnerInvoiceUploadPage() {
  const session = await requirePartnerSession();
  const opcos = await getLinkedOpcosForPartner(BigInt(session.partnerId));

  return (
    <PageCard>
      <PageHeader
        title="Upload Invoice"
        description="Upload a partner-to-client invoice PDF for a linked OpCo and period."
        actions={
          <Link href="/partner/invoices" className="text-sm text-foreground-muted underline">
            ← Back to invoices
          </Link>
        }
      />
      <InvoiceUploadForm opcos={opcos} />
    </PageCard>
  );
}

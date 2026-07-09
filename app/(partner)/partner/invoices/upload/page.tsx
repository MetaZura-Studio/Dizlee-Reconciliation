import Link from "next/link";

import { InvoiceUploadForm } from "@/components/partner/InvoiceUploadForm";
import { requirePartnerSession } from "@/lib/partner/auth";
import { getLinkedOpcosForPartner } from "@/lib/partner/queries/opcos";

export default async function PartnerInvoiceUploadPage() {
  const session = await requirePartnerSession();
  const opcos = await getLinkedOpcosForPartner(BigInt(session.partnerId));

  return (
    <div className="space-y-6">
      <div>
        <Link href="/partner/invoices" className="text-sm text-foreground-muted underline">
          ← Back to invoices
        </Link>
        <h1 className="mt-3 text-2xl font-semibold">Upload Invoice</h1>
        <p className="mt-1 text-foreground-muted">
          Upload a partner-to-client invoice PDF for a linked OpCo and period.
        </p>
      </div>

      <InvoiceUploadForm opcos={opcos} />
    </div>
  );
}

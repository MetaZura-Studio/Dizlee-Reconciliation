import { InvoiceUploadForm } from "@/components/partner/InvoiceUploadForm";
import { requirePartnerSession } from "@/lib/partner/auth";
import { getLinkedOpcosForPartner } from "@/lib/partner/queries/opcos";

export default async function PartnerInvoicesPage() {
  const session = await requirePartnerSession();
  const opcos = await getLinkedOpcosForPartner(BigInt(session.partnerId));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Upload Invoice</h1>
        <p className="mt-1 text-zinc-600">
          Upload a partner-to-client invoice PDF for a linked OpCo and period.
        </p>
      </div>

      <InvoiceUploadForm opcos={opcos} />
    </div>
  );
}

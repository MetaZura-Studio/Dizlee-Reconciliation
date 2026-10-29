import Link from "next/link";

import { InvoiceUploadForm } from "@/components/partner/InvoiceUploadForm";
import { PageCard, PageHeader } from "@/components/ui/page";
import { requirePartnerSession } from "@/lib/partner/auth";
import { getPartnerInvoiceUploadEnabled } from "@/lib/platform/partner-invoice-upload-access";

export default async function PartnerInvoiceUploadPage() {
  const session = await requirePartnerSession();
  const uploadEnabled = await getPartnerInvoiceUploadEnabled(
    BigInt(session.partnerId),
  );

  return (
    <PageCard>
      <PageHeader
        title="Upload Invoice"
        description={
          uploadEnabled
            ? "Upload a Partner → Dizlee invoice PDF for a reporting period."
            : "Invoice upload is currently closed by Dizlee."
        }
        actions={
          <Link href="/partner/invoices" className="text-sm text-foreground-muted underline">
            ← Back to invoices
          </Link>
        }
      />
      <InvoiceUploadForm uploadEnabled={uploadEnabled} />
    </PageCard>
  );
}

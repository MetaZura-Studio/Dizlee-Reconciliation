import Link from "next/link";

import { InvoiceUploadForm } from "@/components/partner/InvoiceUploadForm";
import { PageCard, PageHeader } from "@/components/ui/page";
import { requirePartnerSession } from "@/lib/partner/auth";

export default async function PartnerInvoiceUploadPage() {
  await requirePartnerSession();

  return (
    <PageCard>
      <PageHeader
        title="Upload Invoice"
        description="Upload a Partner → Dizlee invoice PDF for a reporting period."
        actions={
          <Link href="/partner/invoices" className="text-sm text-foreground-muted underline">
            ← Back to invoices
          </Link>
        }
      />
      <InvoiceUploadForm />
    </PageCard>
  );
}

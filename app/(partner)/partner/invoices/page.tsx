import Link from "next/link";

import { InvoicesTable } from "@/components/partner/InvoicesTable";
import { PageCard, PageHeader } from "@/components/ui/page";
import { ui } from "@/lib/ui/classes";
import { getPartnerInvoiceUploadEnabled } from "@/lib/platform/partner-invoice-upload-access";
import { requirePartnerSession } from "@/lib/partner/auth";
import {
  getPartnerInvoiceFilterOptions,
  parsePartnerInvoiceListFilters,
  searchInvoicesForPartner,
} from "@/lib/partner/queries/invoices";

type PartnerInvoicesPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function toSearchParams(
  params: Record<string, string | string[] | undefined>,
): URLSearchParams {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") {
      searchParams.set(key, value);
    } else if (Array.isArray(value) && value[0]) {
      searchParams.set(key, value[0]);
    }
  }

  return searchParams;
}

export default async function PartnerInvoicesPage({
  searchParams,
}: PartnerInvoicesPageProps) {
  const session = await requirePartnerSession();
  const partnerId = BigInt(session.partnerId);
  const filters = parsePartnerInvoiceListFilters(
    toSearchParams(await searchParams),
  );

  const [result, filterOptions, uploadEnabled] = await Promise.all([
    searchInvoicesForPartner(partnerId, filters),
    getPartnerInvoiceFilterOptions(),
    getPartnerInvoiceUploadEnabled(partnerId),
  ]);

  return (
    <PageCard>
      <PageHeader
        title="Invoices"
        description={
          uploadEnabled
            ? "View partner-to-client invoices and track lifecycle status with Dizlee."
            : "View invoices. Upload is currently closed by Dizlee."
        }
        actions={
          uploadEnabled ? (
            <Link href="/partner/invoices/upload" className={ui.btnPrimary}>
              Upload invoice
            </Link>
          ) : (
            <span
              className={`${ui.btnSecondary} cursor-not-allowed opacity-60`}
              title="Invoice upload is currently disabled by Dizlee"
            >
              Upload invoice
            </span>
          )
        }
      />
      <InvoicesTable
        initialResult={result}
        filterOptions={filterOptions}
        uploadEnabled={uploadEnabled}
      />
    </PageCard>
  );
}

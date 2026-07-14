import Link from "next/link";

import { InvoicesTable } from "@/components/partner/InvoicesTable";
import { PageCard, PageHeader } from "@/components/ui/page";
import { ui } from "@/lib/ui/classes";
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

  const [result, filterOptions] = await Promise.all([
    searchInvoicesForPartner(partnerId, filters),
    getPartnerInvoiceFilterOptions(partnerId),
  ]);

  return (
    <PageCard>
      <PageHeader
        title="Invoices"
        description="View partner-to-client invoices and track lifecycle status with Dizlee."
        actions={
          <Link href="/partner/invoices/upload" className={ui.btnPrimary}>
            Upload invoice
          </Link>
        }
      />
      <InvoicesTable initialResult={result} filterOptions={filterOptions} />
    </PageCard>
  );
}

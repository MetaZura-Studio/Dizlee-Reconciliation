import Link from "next/link";

import { InvoicesTable } from "@/components/partner/InvoicesTable";
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
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Invoices</h1>
          <p className="mt-1 text-foreground-muted">
            View partner-to-client invoices and track lifecycle status with Dizlee.
          </p>
        </div>
        <Link
          href="/partner/invoices/upload"
          className="rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
        >
          Upload invoice
        </Link>
      </div>

      <InvoicesTable initialResult={result} filterOptions={filterOptions} />
    </div>
  );
}

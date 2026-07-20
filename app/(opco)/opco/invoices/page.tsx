import { InvoicesTable } from "@/components/opco/InvoicesTable";
import { PageCard, PageHeader } from "@/components/ui/page";
import { requireOpcoSession } from "@/lib/opco/auth";
import {
  getOpcoInvoiceFilterOptions,
  parseOpcoInvoiceListFilters,
  searchInvoicesForOpco,
} from "@/lib/opco/queries/invoices";

type OpcoInvoicesPageProps = {
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

export default async function OpcoInvoicesPage({
  searchParams,
}: OpcoInvoicesPageProps) {
  const session = await requireOpcoSession();
  const opcoId = BigInt(session.opcoId);
  const filters = parseOpcoInvoiceListFilters(
    toSearchParams(await searchParams),
  );

  const [result, filterOptions] = await Promise.all([
    searchInvoicesForOpco(opcoId, filters),
    getOpcoInvoiceFilterOptions(),
  ]);

  return (
    <PageCard>
      <PageHeader
        title="Invoices"
        description="Search by invoice number, or filter by period, status, and payment. Opening an invoice acknowledges receipt automatically."
      />
      <InvoicesTable initialResult={result} filterOptions={filterOptions} />
    </PageCard>
  );
}

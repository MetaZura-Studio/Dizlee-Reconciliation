import { InvoicesTable } from "@/components/opco/InvoicesTable";
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
    getOpcoInvoiceFilterOptions(opcoId),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Invoices</h1>
        <p className="mt-1 text-zinc-600">
          View Dizlee → OpCo invoices. Opening an invoice acknowledges receipt automatically.
        </p>
      </div>

      <InvoicesTable initialResult={result} filterOptions={filterOptions} />
    </div>
  );
}

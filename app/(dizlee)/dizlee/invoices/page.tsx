import { InvoicesListView } from "@/components/dizlee/invoices-list-view";
import {
  getInvoiceFilterOptions,
  listInvoices,
  parseInvoiceListFilters,
} from "@/lib/dizlee/invoices";

type DizleeInvoicesPageProps = {
  searchParams: Promise<{
    month?: string;
    year?: string;
    from?: string;
    opcoId?: string;
    partnerId?: string;
    paymentStatus?: string;
    sortBy?: string;
    sortDir?: string;
    page?: string;
  }>;
};

export default async function DizleeInvoicesPage({
  searchParams,
}: DizleeInvoicesPageProps) {
  const params = await searchParams;
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value && key !== "from") {
      query.set(key, value);
    }
  }

  const filters = parseInvoiceListFilters(query);
  const [initialResult, filterOptions] = await Promise.all([
    listInvoices(filters),
    getInvoiceFilterOptions(),
  ]);

  return (
    <InvoicesListView
      initialResult={initialResult}
      initialFilterOptions={filterOptions}
      fromDashboard={params.from === "dashboard"}
    />
  );
}

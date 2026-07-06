import { InvoicesLifecycleView } from "@/components/dizlee/invoices-lifecycle-view";
import {
  getInvoiceFilterOptions,
  getInvoiceLifecycleDetail,
  listLifecycleInvoices,
  parseLifecycleListFilters,
} from "@/lib/dizlee/invoice-lifecycle";

type DizleeInvoicesLifecyclePageProps = {
  searchParams: Promise<{
    month?: string;
    year?: string;
    opcoId?: string;
    partnerId?: string;
    page?: string;
  }>;
};

export default async function DizleeInvoicesLifecyclePage({
  searchParams,
}: DizleeInvoicesLifecyclePageProps) {
  const params = await searchParams;
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value) {
      query.set(key, value);
    }
  }

  const filters = parseLifecycleListFilters(query);
  const [initialResult, filterOptions] = await Promise.all([
    listLifecycleInvoices(filters),
    getInvoiceFilterOptions(),
  ]);
  const initialDetail = initialResult.items[0]
    ? await getInvoiceLifecycleDetail(initialResult.items[0].id)
    : null;

  return (
    <InvoicesLifecycleView
      initialResult={initialResult}
      initialFilterOptions={filterOptions}
      initialDetail={initialDetail}
    />
  );
}

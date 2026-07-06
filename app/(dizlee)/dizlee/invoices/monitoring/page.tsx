import { InvoicesMonitoringView } from "@/components/dizlee/invoices-monitoring-view";
import {
  getInvoiceFilterOptions,
  listInvoiceMonitoringLanes,
  parseInvoiceMonitoringFilters,
} from "@/lib/dizlee/invoices-monitoring";

type DizleeInvoicesMonitoringPageProps = {
  searchParams: Promise<{
    month?: string;
    year?: string;
    from?: string;
    opcoId?: string;
    partnerId?: string;
    missing?: string;
    page?: string;
  }>;
};

export default async function DizleeInvoicesMonitoringPage({
  searchParams,
}: DizleeInvoicesMonitoringPageProps) {
  const params = await searchParams;
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value && key !== "from") {
      query.set(key, value);
    }
  }

  const filters = parseInvoiceMonitoringFilters(query);
  const [initialResult, filterOptions] = await Promise.all([
    listInvoiceMonitoringLanes(filters),
    getInvoiceFilterOptions(),
  ]);

  return (
    <InvoicesMonitoringView
      initialResult={initialResult}
      initialFilterOptions={filterOptions}
      fromDashboard={params.from === "dashboard"}
    />
  );
}

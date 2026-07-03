import { ReportsListView } from "@/components/dizlee/reports-list-view";
import {
  getReportFilterOptions,
  listReports,
  parseReportListFilters,
} from "@/lib/dizlee/reports";

type DizleeReportsPageProps = {
  searchParams: Promise<{
    month?: string;
    year?: string;
    from?: string;
    opcoId?: string;
    partnerId?: string;
    sortBy?: string;
    sortDir?: string;
    page?: string;
  }>;
};

export default async function DizleeReportsPage({
  searchParams,
}: DizleeReportsPageProps) {
  const params = await searchParams;
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value && key !== "from") {
      query.set(key, value);
    }
  }

  const filters = parseReportListFilters(query);
  const [initialResult, filterOptions] = await Promise.all([
    listReports(filters),
    getReportFilterOptions(),
  ]);

  return (
    <ReportsListView
      initialResult={initialResult}
      initialFilterOptions={filterOptions}
      fromDashboard={params.from === "dashboard"}
    />
  );
}

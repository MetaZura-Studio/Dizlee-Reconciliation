import { ReportsMonitoringView } from "@/components/dizlee/reports-monitoring-view";
import {
  getReportFilterOptions,
  listReportMonitoringLanes,
  parseReportMonitoringFilters,
} from "@/lib/dizlee/reports-monitoring";

type DizleeReportsMonitoringPageProps = {
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

export default async function DizleeReportsMonitoringPage({
  searchParams,
}: DizleeReportsMonitoringPageProps) {
  const params = await searchParams;
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value && key !== "from") {
      query.set(key, value);
    }
  }

  const filters = parseReportMonitoringFilters(query);
  const [initialResult, filterOptions] = await Promise.all([
    listReportMonitoringLanes(filters),
    getReportFilterOptions(),
  ]);

  return (
    <ReportsMonitoringView
      initialResult={initialResult}
      initialFilterOptions={filterOptions}
      fromDashboard={params.from === "dashboard"}
    />
  );
}

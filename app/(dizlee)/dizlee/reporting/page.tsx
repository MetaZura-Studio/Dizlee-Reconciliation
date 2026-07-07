import { ReportingView } from "@/components/dizlee/reporting-view";
import {
  getReportingOverview,
  getReportFilterOptions,
  parseReportingFilters,
} from "@/lib/dizlee/reporting";

type DizleeReportingPageProps = {
  searchParams: Promise<{
    month?: string;
    year?: string;
    opcoId?: string;
    partnerId?: string;
  }>;
};

export default async function DizleeReportingPage({
  searchParams,
}: DizleeReportingPageProps) {
  const params = await searchParams;
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value) {
      query.set(key, value);
    }
  }

  const filters = parseReportingFilters(query);

  const [initialOverview, initialFilterOptions] = await Promise.all([
    getReportingOverview(filters),
    getReportFilterOptions(),
  ]);

  return (
    <ReportingView
      initialOverview={initialOverview}
      initialFilterOptions={initialFilterOptions}
    />
  );
}

import { RevenueShareView } from "@/components/dizlee/revenue-share-view";
import { currentPeriod } from "@/lib/dizlee/dashboard";
import { getReportFilterOptions } from "@/lib/dizlee/reports";
import { parseRevenueShareFilters } from "@/lib/dizlee/revenue-share";

type DizleeRevenueSharePageProps = {
  searchParams: Promise<{
    month?: string;
    year?: string;
    opcoId?: string;
  }>;
};

export default async function DizleeRevenueSharePage({
  searchParams,
}: DizleeRevenueSharePageProps) {
  const params = await searchParams;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) {
      query.set(key, value);
    }
  }

  const filters = parseRevenueShareFilters(query);
  const fallback = currentPeriod();
  const filterOptions = await getReportFilterOptions();

  return (
    <RevenueShareView
      initialMonth={filters.month ?? fallback.month}
      initialYear={filters.year ?? fallback.year}
      initialFilterOptions={filterOptions}
    />
  );
}

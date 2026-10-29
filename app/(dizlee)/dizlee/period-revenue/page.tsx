import { PeriodRevenueView } from "@/components/dizlee/period-revenue-view";
import {
  getPeriodRevenue,
  getPeriodRevenueFilterOptions,
  parsePeriodRevenueFilters,
} from "@/lib/dizlee/period-revenue";

type PageProps = {
  searchParams: Promise<{
    month?: string;
    year?: string;
    opcoId?: string;
    partnerId?: string;
  }>;
};

export default async function DizleePeriodRevenuePage({
  searchParams,
}: PageProps) {
  const params = await searchParams;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) {
      query.set(key, value);
    }
  }

  const filters = parsePeriodRevenueFilters(query);
  const [initialResult, initialFilterOptions] = await Promise.all([
    getPeriodRevenue(filters),
    getPeriodRevenueFilterOptions(),
  ]);

  return (
    <PeriodRevenueView
      initialResult={initialResult}
      initialFilterOptions={initialFilterOptions}
    />
  );
}

import { ActivityView } from "@/components/dizlee/activity-view";
import {
  listActivityTimeline,
  parseActivityFilters,
} from "@/lib/dizlee/activity";
import { getReportFilterOptions } from "@/lib/dizlee/reports";

type DizleeActivityPageProps = {
  searchParams: Promise<{
    month?: string;
    year?: string;
    opcoId?: string;
    partnerId?: string;
  }>;
};

export default async function DizleeActivityPage({
  searchParams,
}: DizleeActivityPageProps) {
  const params = await searchParams;
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value) {
      query.set(key, value);
    }
  }

  const filters = parseActivityFilters(query);
  const [initialResult, initialFilterOptions] = await Promise.all([
    listActivityTimeline(filters),
    getReportFilterOptions(),
  ]);

  return (
    <ActivityView
      initialResult={initialResult}
      initialFilterOptions={initialFilterOptions}
    />
  );
}

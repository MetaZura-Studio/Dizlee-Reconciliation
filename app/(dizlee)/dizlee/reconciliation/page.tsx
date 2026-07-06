import { ReconciliationView } from "@/components/dizlee/reconciliation-view";
import {
  getReconciliationDetail,
  getTolerancePercent,
  listCompareLanes,
  listReconciliationHistory,
  parseCompareLaneFilters,
  parseHistoryFilters,
} from "@/lib/dizlee/reconciliation";
import { getReportFilterOptions } from "@/lib/dizlee/reports";

type DizleeReconciliationPageProps = {
  searchParams: Promise<{
    tab?: string;
    id?: string;
    month?: string;
    year?: string;
    searchBy?: string;
    entityId?: string;
  }>;
};

export default async function DizleeReconciliationPage({
  searchParams,
}: DizleeReconciliationPageProps) {
  const params = await searchParams;
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value && key !== "tab" && key !== "id") {
      query.set(key, value);
    }
  }

  const compareFilters = parseCompareLaneFilters(query);
  const historyFilters = parseHistoryFilters(new URLSearchParams());
  const reconciliationId = params.id ? Number(params.id) : null;

  const [initialLanes, filterOptions, tolerancePercent, initialHistory, initialDetail] =
    await Promise.all([
      listCompareLanes(compareFilters),
      getReportFilterOptions(),
      getTolerancePercent(),
      listReconciliationHistory(historyFilters),
      reconciliationId && Number.isInteger(reconciliationId)
        ? getReconciliationDetail(reconciliationId)
        : Promise.resolve(null),
    ]);

  return (
    <ReconciliationView
      initialTab={params.tab === "history" ? "history" : "compare"}
      initialCompareFilters={compareFilters}
      initialLanes={initialLanes}
      initialFilterOptions={filterOptions}
      initialTolerancePercent={tolerancePercent}
      initialHistory={initialHistory}
      initialDetail={initialDetail}
    />
  );
}

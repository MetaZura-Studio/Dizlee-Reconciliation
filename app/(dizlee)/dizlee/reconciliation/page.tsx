import { redirect } from "next/navigation";

import { ReconciliationView } from "@/components/dizlee/reconciliation-view";
import {
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

  if (params.id) {
    const reconciliationId = Number(params.id);
    if (Number.isInteger(reconciliationId) && reconciliationId >= 1) {
      redirect(`/dizlee/reconciliation/${reconciliationId}`);
    }
  }

  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value && key !== "tab" && key !== "id") {
      query.set(key, value);
    }
  }

  const compareFilters = parseCompareLaneFilters(query);
  const historyFilters = parseHistoryFilters(new URLSearchParams());

  const [initialLanes, filterOptions, tolerancePercent, initialHistory] =
    await Promise.all([
      listCompareLanes(compareFilters),
      getReportFilterOptions(),
      getTolerancePercent(),
      listReconciliationHistory(historyFilters),
    ]);

  return (
    <ReconciliationView
      initialTab={params.tab === "history" ? "history" : "compare"}
      initialCompareFilters={compareFilters}
      initialLanes={initialLanes}
      initialFilterOptions={filterOptions}
      initialTolerancePercent={tolerancePercent}
      initialHistory={initialHistory}
    />
  );
}

import { redirect } from "next/navigation";

import { ConsolidationView } from "@/components/dizlee/consolidation-view";
import { currentPeriod } from "@/lib/dizlee/dashboard";
import {
  getConsolidationReadiness,
  listConsolidationHistory,
  parseGenerateFilters,
  parseHistoryFilters,
} from "@/lib/dizlee/consolidation";
import { getReportFilterOptions } from "@/lib/dizlee/reports";

type DizleeConsolidationPageProps = {
  searchParams: Promise<{
    tab?: string;
    id?: string;
    month?: string;
    year?: string;
    opcoId?: string;
  }>;
};

export default async function DizleeConsolidationPage({
  searchParams,
}: DizleeConsolidationPageProps) {
  const params = await searchParams;

  if (params.id) {
    const consolidationId = Number(params.id);
    if (Number.isInteger(consolidationId) && consolidationId >= 1) {
      redirect(`/dizlee/consolidation/${consolidationId}`);
    }
  }

  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value && key !== "tab" && key !== "id") {
      query.set(key, value);
    }
  }

  const generateFilters = parseGenerateFilters(query);
  const historyFilters = parseHistoryFilters(query);
  const fallback = currentPeriod();

  const [filterOptions, initialHistory] = await Promise.all([
    getReportFilterOptions(),
    listConsolidationHistory(historyFilters),
  ]);

  const initialOpcoId =
    generateFilters.opcoId ?? filterOptions.opcos[0]?.id ?? "";

  const initialReadiness = initialOpcoId
    ? await getConsolidationReadiness({
        month: generateFilters.month,
        year: generateFilters.year,
        opcoId: initialOpcoId,
      })
    : null;

  return (
    <ConsolidationView
      initialTab={params.tab === "history" ? "history" : "generate"}
      initialMonth={generateFilters.month ?? fallback.month}
      initialYear={generateFilters.year ?? fallback.year}
      initialOpcoId={initialOpcoId}
      initialFilterOptions={filterOptions}
      initialReadiness={initialReadiness}
      initialHistory={initialHistory}
    />
  );
}

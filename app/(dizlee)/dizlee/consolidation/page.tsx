import { ConsolidationView } from "@/components/dizlee/consolidation-view";
import { currentPeriod } from "@/lib/dizlee/dashboard";
import {
  getConsolidationDetail,
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
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value && key !== "tab" && key !== "id") {
      query.set(key, value);
    }
  }

  const generateFilters = parseGenerateFilters(query);
  const historyFilters = parseHistoryFilters(query);
  const consolidationId = params.id ? Number(params.id) : null;
  const fallback = currentPeriod();

  const [filterOptions, initialHistory, initialDetail] = await Promise.all([
    getReportFilterOptions(),
    listConsolidationHistory(historyFilters),
    consolidationId && Number.isInteger(consolidationId)
      ? getConsolidationDetail(consolidationId)
      : Promise.resolve(null),
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
      initialDetail={initialDetail}
    />
  );
}

import { ReportsTable } from "@/components/opco/ReportsTable";
import { requireOpcoSession } from "@/lib/opco/auth";
import {
  getOpcoReportFilterOptions,
  parseOpcoReportListFilters,
  searchReportsForOpco,
} from "@/lib/opco/queries/reports";

type OpcoReportsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function toSearchParams(
  params: Record<string, string | string[] | undefined>,
): URLSearchParams {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") {
      searchParams.set(key, value);
    } else if (Array.isArray(value) && value[0]) {
      searchParams.set(key, value[0]);
    }
  }

  return searchParams;
}

export default async function OpcoReportsPage({ searchParams }: OpcoReportsPageProps) {
  const session = await requireOpcoSession();
  const opcoId = BigInt(session.opcoId);
  const filters = parseOpcoReportListFilters(
    toSearchParams(await searchParams),
  );

  const [result, filterOptions] = await Promise.all([
    searchReportsForOpco(opcoId, filters),
    getOpcoReportFilterOptions(opcoId),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Reports history</h1>
        <p className="mt-1 text-foreground-muted">
          Find and review submitted reports. Filter by period, partner, or status.
        </p>
      </div>

      <ReportsTable initialResult={result} filterOptions={filterOptions} />
    </div>
  );
}

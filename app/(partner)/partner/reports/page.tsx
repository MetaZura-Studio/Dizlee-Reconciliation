import { ReportsTable } from "@/components/partner/ReportsTable";
import { requirePartnerSession } from "@/lib/partner/auth";
import {
  getPartnerReportFilterOptions,
  parsePartnerReportListFilters,
  searchReportsForPartner,
} from "@/lib/partner/queries/reports";

type PartnerReportsPageProps = {
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

export default async function PartnerReportsPage({
  searchParams,
}: PartnerReportsPageProps) {
  const session = await requirePartnerSession();
  const partnerId = BigInt(session.partnerId);
  const filters = parsePartnerReportListFilters(
    toSearchParams(await searchParams),
  );

  const [result, filterOptions] = await Promise.all([
    searchReportsForPartner(partnerId, filters),
    getPartnerReportFilterOptions(partnerId),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Reports</h1>
        <p className="mt-1 text-foreground-muted">
          Find and review submitted reports. Filter by period, OpCo, or status.
        </p>
      </div>

      <ReportsTable initialResult={result} filterOptions={filterOptions} />
    </div>
  );
}

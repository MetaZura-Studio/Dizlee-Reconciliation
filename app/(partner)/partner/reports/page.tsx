import { ReportsTable } from "@/components/partner/ReportsTable";
import { PageCard, PageHeader } from "@/components/ui/page";
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
    <PageCard>
      <PageHeader
        title="Reports history"
        description="Search by filename or OpCo, or filter by period and status."
      />
      <ReportsTable initialResult={result} filterOptions={filterOptions} />
    </PageCard>
  );
}

import { ReportsTable } from "@/components/opco/ReportsTable";
import { PageCard, PageHeader } from "@/components/ui/page";
import { parseStoredSampleHeaders } from "@/lib/admin/opco-report-mapping-excel";
import { getOpcoReportMappingByOpcoId } from "@/lib/admin/opco-report-mappings";
import { requireOpcoSession } from "@/lib/opco/auth";
import {
  getOpcoReportFilterOptions,
  parseOpcoReportListFiltersForPage,
  searchReportsForOpco,
} from "@/lib/opco/queries/reports";
import { listOpcoSubmissionsForReuploadPage } from "@/lib/opco/queries/submissions";

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
  const filters = parseOpcoReportListFiltersForPage(
    toSearchParams(await searchParams),
  );

  const [result, filterOptions, submissionPage, mapping] = await Promise.all([
    searchReportsForOpco(opcoId, filters),
    getOpcoReportFilterOptions(opcoId),
    listOpcoSubmissionsForReuploadPage(opcoId),
    getOpcoReportMappingByOpcoId(opcoId),
  ]);

  const preferredSheetName = mapping
    ? parseStoredSampleHeaders(mapping.headersJson).sheetName
    : null;

  return (
    <PageCard>
      <PageHeader
        title="Report History"
        description="Search partner reports by filename or partner, or filter by period and status. Request or complete monthly raw-file reuploads from the section above the partner list."
      />
      <ReportsTable
        initialResult={result}
        filterOptions={filterOptions}
        reuploadItems={submissionPage.items}
        preferredSheetName={preferredSheetName}
      />
    </PageCard>
  );
}

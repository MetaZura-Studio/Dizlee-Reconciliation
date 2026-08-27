import { ReuploadReportsView } from "@/components/opco/reupload-reports-view";
import { PageCard, PageHeader } from "@/components/ui/page";
import { parseStoredSampleHeaders } from "@/lib/admin/opco-report-mapping-excel";
import { getOpcoReportMappingByOpcoId } from "@/lib/admin/opco-report-mappings";
import { requireOpcoSession } from "@/lib/opco/auth";
import { listOpcoSubmissionsForReuploadPage } from "@/lib/opco/queries/submissions";

export default async function OpcoReuploadReportsPage() {
  const session = await requireOpcoSession();
  const opcoId = BigInt(session.opcoId);

  const [pageData, mapping] = await Promise.all([
    listOpcoSubmissionsForReuploadPage(opcoId),
    getOpcoReportMappingByOpcoId(opcoId),
  ]);

  const preferredSheetName = mapping
    ? parseStoredSampleHeaders(mapping.headersJson).sheetName
    : null;

  return (
    <PageCard>
      <PageHeader
        title="Re Upload Report"
        description="Request Dizlee approval to replace your monthly raw Excel, then upload the corrected file. Partner data for that month is overridden."
      />
      <ReuploadReportsView
        items={pageData.items}
        currentPeriodLabel={pageData.currentPeriod.periodLabel}
        hasFileForCurrentPeriod={pageData.hasFileForCurrentPeriod}
        preferredSheetName={preferredSheetName}
      />
    </PageCard>
  );
}

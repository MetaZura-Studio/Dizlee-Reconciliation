import { ReportUploadForm } from "@/components/opco/ReportUploadForm";
import { PageCard, PageHeader } from "@/components/ui/page";
import { parseStoredSampleHeaders } from "@/lib/admin/opco-report-mapping-excel";
import { getOpcoReportMappingByOpcoId } from "@/lib/admin/opco-report-mappings";
import { requireOpcoSession } from "@/lib/opco/auth";
import { getLinkedPartnersForOpco } from "@/lib/opco/queries/partners";
import { getOpcoUploadReadiness } from "@/lib/opco/queries/report-map-request";

/** Always load current OpCo–Partner links (Admin changes must appear immediately). */
export const dynamic = "force-dynamic";

export default async function OpcoUploadPage() {
  const session = await requireOpcoSession();
  const opcoId = BigInt(session.opcoId);
  const [partners, mapping, readiness] = await Promise.all([
    getLinkedPartnersForOpco(opcoId),
    getOpcoReportMappingByOpcoId(opcoId),
    getOpcoUploadReadiness(opcoId),
  ]);

  const partnerMode = mapping?.partnerMode ?? "EXCEL_COLUMN";
  const preferredSheetName = mapping
    ? parseStoredSampleHeaders(mapping.headersJson).sheetName
    : null;

  return (
    <PageCard>
      <PageHeader title="Upload Report" />
      <ReportUploadForm
        partners={partners}
        partnerFromServiceMap={partnerMode !== "UPLOAD_PICKER"}
        preferredSheetName={preferredSheetName}
        initialReadiness={readiness}
      />
    </PageCard>
  );
}

import { ReportUploadForm } from "@/components/opco/ReportUploadForm";
import { PageCard, PageHeader } from "@/components/ui/page";
import { parseStoredSampleHeaders } from "@/lib/admin/opco-report-mapping-excel";
import { getOpcoReportMappingByOpcoId } from "@/lib/admin/opco-report-mappings";
import { requireOpcoSession } from "@/lib/opco/auth";
import { getLinkedPartnersForOpco } from "@/lib/opco/queries/partners";

/** Always load current OpCo–Partner links (Admin changes must appear immediately). */
export const dynamic = "force-dynamic";

export default async function OpcoUploadPage() {
  const session = await requireOpcoSession();
  const opcoId = BigInt(session.opcoId);
  const [partners, mapping] = await Promise.all([
    getLinkedPartnersForOpco(opcoId),
    getOpcoReportMappingByOpcoId(opcoId),
  ]);

  const partnerMode = mapping?.partnerMode ?? "EXCEL_COLUMN";
  const autoResolvePartners = partnerMode !== "UPLOAD_PICKER";
  const preferredSheetName = mapping
    ? parseStoredSampleHeaders(mapping.headersJson).sheetName
    : null;

  return (
    <PageCard>
      <PageHeader
        title="Upload Report"
        description="Upload one monthly Excel. Partners resolve from the file or Admin maps when configured."
      />
      <ReportUploadForm
        partners={partners}
        partnerFromServiceMap={autoResolvePartners}
        preferredSheetName={preferredSheetName}
      />
    </PageCard>
  );
}

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
        description={
          autoResolvePartners
            ? partnerMode === "SERVICE_PARTNER_MAP"
              ? "Upload one monthly Excel. Partner is resolved from Admin Service–Partner maps."
              : "Upload one monthly Excel. Partner is taken from the mapped Excel column."
            : "Upload a monthly Excel report for a linked partner."
        }
      />
      <ReportUploadForm
        partners={partners}
        partnerFromServiceMap={autoResolvePartners}
        preferredSheetName={preferredSheetName}
      />
    </PageCard>
  );
}

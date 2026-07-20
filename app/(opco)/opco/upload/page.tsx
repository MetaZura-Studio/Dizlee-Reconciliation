import { ReportUploadForm } from "@/components/opco/ReportUploadForm";
import { PageCard, PageHeader } from "@/components/ui/page";
import { requireOpcoSession } from "@/lib/opco/auth";
import { getLinkedPartnersForOpco } from "@/lib/opco/queries/partners";

export default async function OpcoUploadPage() {
  const session = await requireOpcoSession();
  const partners = await getLinkedPartnersForOpco(BigInt(session.opcoId));

  return (
    <PageCard>
      <PageHeader
        title="Upload Report"
        description="Upload a monthly Excel report for a linked partner."
      />
      <ReportUploadForm partners={partners} />
    </PageCard>
  );
}

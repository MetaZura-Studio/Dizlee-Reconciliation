import { ReportUploadForm } from "@/components/partner/ReportUploadForm";
import { PageCard, PageHeader } from "@/components/ui/page";
import { requirePartnerSession } from "@/lib/partner/auth";
import { getLinkedOpcosForPartner } from "@/lib/partner/queries/opcos";

/** Always load current OpCo–Partner links (Admin changes must appear immediately). */
export const dynamic = "force-dynamic";

export default async function PartnerUploadPage() {
  const session = await requirePartnerSession();
  const opcos = await getLinkedOpcosForPartner(BigInt(session.partnerId));

  return (
    <PageCard>
      <PageHeader
        title="Upload Report"
        description="Upload a monthly Excel report for a linked OpCo."
      />
      <ReportUploadForm opcos={opcos} />
    </PageCard>
  );
}

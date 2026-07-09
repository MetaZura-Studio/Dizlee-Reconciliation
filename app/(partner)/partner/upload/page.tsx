import { ReportUploadForm } from "@/components/partner/ReportUploadForm";
import { requirePartnerSession } from "@/lib/partner/auth";
import { getLinkedOpcosForPartner } from "@/lib/partner/queries/opcos";

export default async function PartnerUploadPage() {
  const session = await requirePartnerSession();
  const opcos = await getLinkedOpcosForPartner(BigInt(session.partnerId));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Upload Report</h1>
        <p className="mt-1 text-foreground-muted">
          Upload a monthly Excel report for a linked OpCo.
        </p>
      </div>

      <ReportUploadForm opcos={opcos} />
    </div>
  );
}

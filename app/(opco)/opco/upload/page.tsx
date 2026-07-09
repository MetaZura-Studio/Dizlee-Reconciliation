import { ReportUploadForm } from "@/components/opco/ReportUploadForm";
import { requireOpcoSession } from "@/lib/opco/auth";
import { getLinkedPartnersForOpco } from "@/lib/opco/queries/partners";

export default async function OpcoUploadPage() {
  const session = await requireOpcoSession();
  const partners = await getLinkedPartnersForOpco(BigInt(session.opcoId));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Upload Report</h1>
        <p className="mt-1 text-foreground-muted">
          Upload a monthly Excel report for a linked partner.
        </p>
      </div>

      <ReportUploadForm partners={partners} />
    </div>
  );
}

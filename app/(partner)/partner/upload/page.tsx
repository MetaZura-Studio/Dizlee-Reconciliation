import { PlaceholderPage } from "@/components/partner/PlaceholderPage";
import { requirePartnerSession } from "@/lib/partner/auth";

export default async function PartnerUploadPage() {
  await requirePartnerSession();

  return (
    <PlaceholderPage
      title="Upload Report"
      description="Upload a monthly Excel report for a linked OpCo."
    />
  );
}

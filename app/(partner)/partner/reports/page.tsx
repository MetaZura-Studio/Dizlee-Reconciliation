import { PlaceholderPage } from "@/components/partner/PlaceholderPage";
import { requirePartnerSession } from "@/lib/partner/auth";

export default async function PartnerReportsPage() {
  await requirePartnerSession();

  return (
    <PlaceholderPage
      title="Reports"
      description="Browse and filter your submitted reconciliation reports."
    />
  );
}

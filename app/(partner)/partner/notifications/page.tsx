import { PlaceholderPage } from "@/components/partner/PlaceholderPage";
import { requirePartnerSession } from "@/lib/partner/auth";

export default async function PartnerNotificationsPage() {
  await requirePartnerSession();

  return (
    <PlaceholderPage
      title="Notifications"
      description="View inbox messages and alerts for your partner account."
    />
  );
}

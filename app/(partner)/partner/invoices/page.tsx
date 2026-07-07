import { PlaceholderPage } from "@/components/partner/PlaceholderPage";
import { requirePartnerSession } from "@/lib/partner/auth";

export default async function PartnerInvoicesPage() {
  await requirePartnerSession();

  return (
    <PlaceholderPage
      title="Invoices"
      description="Upload and track partner-to-client invoices."
    />
  );
}

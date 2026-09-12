import { EmailDeliveryView } from "@/components/admin/email-delivery-view";
import {
  getEmailDeliveryFilterOptions,
  listEmailDeliveries,
  parseEmailDeliveryListFilters,
} from "@/lib/admin/email-delivery";

type AdminEmailDeliveryPageProps = {
  searchParams: Promise<{
    search?: string;
    status?: string;
    purpose?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: string;
    pageSize?: string;
    sortBy?: string;
    sortDir?: string;
  }>;
};

export default async function AdminEmailDeliveryPage({
  searchParams,
}: AdminEmailDeliveryPageProps) {
  const params = await searchParams;
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value) {
      query.set(key, value);
    }
  }

  const initialResult = await listEmailDeliveries(
    parseEmailDeliveryListFilters(query),
  );
  const filterOptions = getEmailDeliveryFilterOptions();

  return (
    <div className="w-full space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Email delivery logs
        </h1>
        <p className="text-sm text-foreground-muted">
          Outbound email attempts: Sent (mail server accepted), Failed (with
          reason), or Skipped. Does not track mailbox bounces.
        </p>
      </div>
      <EmailDeliveryView
        initialResult={initialResult}
        filterOptions={filterOptions}
      />
    </div>
  );
}

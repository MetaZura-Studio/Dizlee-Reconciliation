import { NotificationsInbox } from "@/components/partner/NotificationsInbox";
import { PageCard, PageHeader } from "@/components/ui/page";
import { requirePartnerSession } from "@/lib/partner/auth";
import {
  listPartnerInboxNotifications,
  parsePartnerInboxFilters,
} from "@/lib/partner/queries/notifications";

type PartnerNotificationsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function toSearchParams(
  params: Record<string, string | string[] | undefined>,
): URLSearchParams {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") {
      searchParams.set(key, value);
    } else if (Array.isArray(value) && value[0]) {
      searchParams.set(key, value[0]);
    }
  }

  return searchParams;
}

export default async function PartnerNotificationsPage({
  searchParams,
}: PartnerNotificationsPageProps) {
  const session = await requirePartnerSession();
  const filters = parsePartnerInboxFilters(toSearchParams(await searchParams));

  const result = await listPartnerInboxNotifications({
    userId: BigInt(session.userId),
    partnerId: BigInt(session.partnerId),
    filters,
  });

  return (
    <PageCard>
      <PageHeader
        title="Notifications"
        description="Your partner inbox — messages from Dizlee and the reconciliation system."
      />
      <NotificationsInbox initialResult={result} />
    </PageCard>
  );
}

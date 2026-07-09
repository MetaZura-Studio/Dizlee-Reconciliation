import { NotificationsInbox } from "@/components/partner/NotificationsInbox";
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Notifications</h1>
        <p className="mt-1 text-foreground-muted">
          Your partner inbox — messages from Dizlee and the reconciliation system.
        </p>
      </div>

      <NotificationsInbox initialResult={result} />
    </div>
  );
}

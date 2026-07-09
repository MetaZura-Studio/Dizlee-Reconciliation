import { NotificationsInbox } from "@/components/opco/NotificationsInbox";
import { requireOpcoSession } from "@/lib/opco/auth";
import {
  listOpcoInboxNotifications,
  parseOpcoInboxFilters,
} from "@/lib/opco/queries/notifications";

type OpcoNotificationsPageProps = {
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

export default async function OpcoNotificationsPage({
  searchParams,
}: OpcoNotificationsPageProps) {
  const session = await requireOpcoSession();
  const filters = parseOpcoInboxFilters(toSearchParams(await searchParams));

  const result = await listOpcoInboxNotifications({
    userId: BigInt(session.userId),
    opcoId: BigInt(session.opcoId),
    filters,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Notifications</h1>
        <p className="mt-1 text-foreground-muted">
          Your OpCo inbox — messages from Dizlee and the reconciliation system.
        </p>
      </div>

      <NotificationsInbox initialResult={result} />
    </div>
  );
}

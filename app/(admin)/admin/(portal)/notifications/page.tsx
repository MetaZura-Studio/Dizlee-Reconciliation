import { AdminNotificationsInbox } from "@/components/admin/notifications-inbox";
import { PageCard, PageHeader } from "@/components/ui/page";
import { requireAdminUser } from "@/lib/admin/auth";
import {
  listAdminInboxNotifications,
  parseAdminInboxFilters,
} from "@/lib/admin/notifications";

type AdminNotificationsPageProps = {
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

export default async function AdminNotificationsPage({
  searchParams,
}: AdminNotificationsPageProps) {
  const user = await requireAdminUser();
  const filters = parseAdminInboxFilters(toSearchParams(await searchParams));
  const result = await listAdminInboxNotifications({
    userId: BigInt(user.id),
    filters,
  });

  return (
    <PageCard>
      <PageHeader
        title="Notifications"
        description="Messages from OpCos, including partner-link requests so they can upload reports."
      />
      <AdminNotificationsInbox initialResult={result} />
    </PageCard>
  );
}

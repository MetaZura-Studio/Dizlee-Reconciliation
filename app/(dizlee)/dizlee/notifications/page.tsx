import { IntimationsView } from "@/components/dizlee/intimations-view";
import { PartnerNotificationsView } from "@/components/dizlee/partner-notifications-view";
import { NotificationsTabs } from "@/components/dizlee/notifications-tabs";
import {
  getIntimationFormOptions,
  listIntimations,
  parseIntimationListFilters,
} from "@/lib/dizlee/notifications/intimations";
import {
  getPartnerNotificationFormOptions,
  listPartnerNotifications,
  parsePartnerNotificationListFilters,
} from "@/lib/dizlee/notifications/partners";

type DizleeNotificationsPageProps = {
  searchParams: Promise<{ tab?: string; page?: string }>;
};

function ComingSoonTab({
  tab,
}: {
  tab: "reminders" | "history" | "inbox";
}) {
  const labels: Record<typeof tab, string> = {
    reminders: "Reminders (UC-09)",
    history: "History (UC-9A)",
    inbox: "Inbox",
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Notifications</h1>
        <p className="mt-1 text-sm text-zinc-500">
          {labels[tab]} is coming in a later feature.
        </p>
      </div>
      <NotificationsTabs active={tab} />
    </div>
  );
}

export default async function DizleeNotificationsPage({
  searchParams,
}: DizleeNotificationsPageProps) {
  const params = await searchParams;

  const query = new URLSearchParams();
  if (params.page) {
    query.set("page", params.page);
  }

  if (params.tab === "partners") {
    const filters = parsePartnerNotificationListFilters(query);
    const [initialResult, initialFormOptions] = await Promise.all([
      listPartnerNotifications(filters),
      getPartnerNotificationFormOptions(),
    ]);

    return (
      <PartnerNotificationsView
        initialResult={initialResult}
        initialFormOptions={initialFormOptions}
      />
    );
  }

  if (
    params.tab === "reminders" ||
    params.tab === "history" ||
    params.tab === "inbox"
  ) {
    return <ComingSoonTab tab={params.tab} />;
  }

  const filters = parseIntimationListFilters(query);

  const [initialResult, initialFormOptions] = await Promise.all([
    listIntimations(filters),
    getIntimationFormOptions(),
  ]);

  return (
    <IntimationsView
      initialResult={initialResult}
      initialFormOptions={initialFormOptions}
    />
  );
}

import { NotificationHistoryView } from "@/components/dizlee/notification-history-view";
import { NotificationsInboxView } from "@/components/dizlee/notifications-inbox-view";
import { IntimationsView } from "@/components/dizlee/intimations-view";
import { PartnerNotificationsView } from "@/components/dizlee/partner-notifications-view";
import { RemindersView } from "@/components/dizlee/reminders-view";
import {
  getIntimationFormOptions,
  listIntimations,
  parseIntimationListFilters,
} from "@/lib/dizlee/notifications/intimations";
import {
  getNotificationHistoryDetail,
  listNotificationHistory,
  parseNotificationHistoryFilters,
} from "@/lib/dizlee/notifications/history";
import {
  getInboxNotificationDetail,
  listInboxNotifications,
  parseInboxFilters,
} from "@/lib/dizlee/notifications/inbox";
import {
  getPartnerNotificationFormOptions,
  listPartnerNotifications,
  parsePartnerNotificationListFilters,
} from "@/lib/dizlee/notifications/partners";
import {
  getReminderSettings,
  listReminderLanes,
  parseReminderFilters,
} from "@/lib/dizlee/notifications/reminders";
import { getReportFilterOptions } from "@/lib/dizlee/reports-monitoring";
import { requireDizleeSession } from "@/lib/dizlee/auth";

type DizleeNotificationsPageProps = {
  searchParams: Promise<{
    tab?: string;
    page?: string;
    id?: string;
    month?: string;
    year?: string;
    opcoId?: string;
    partnerId?: string;
    missing?: string;
    unreadOnly?: string;
  }>;
};

export default async function DizleeNotificationsPage({
  searchParams,
}: DizleeNotificationsPageProps) {
  const user = await requireDizleeSession();
  if (!user) {
    return null;
  }

  const params = await searchParams;

  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value && key !== "tab" && key !== "id") {
      query.set(key, value);
    }
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

  if (params.tab === "reminders") {
    if (!query.get("missing")) {
      query.set("missing", "any");
    }

    const filters = parseReminderFilters(query);
    const [initialResult, initialSettings, initialFilterOptions] =
      await Promise.all([
        listReminderLanes(filters),
        getReminderSettings(),
        getReportFilterOptions(),
      ]);

    return (
      <RemindersView
        initialResult={initialResult}
        initialSettings={initialSettings}
        initialFilterOptions={initialFilterOptions}
      />
    );
  }

  if (params.tab === "history") {
    const filters = parseNotificationHistoryFilters(query);
    const initialResult = await listNotificationHistory(filters);
    const initialDetail = params.id
      ? await getNotificationHistoryDetail(params.id)
      : null;

    return (
      <NotificationHistoryView
        initialResult={initialResult}
        initialDetail={initialDetail}
        initialSelectedId={params.id ?? null}
      />
    );
  }

  if (params.tab === "inbox") {
    const filters = parseInboxFilters(query);
    const initialResult = await listInboxNotifications({
      userId: user.id,
      page: filters.page,
      unreadOnly: filters.unreadOnly,
    });
    const initialDetail = params.id
      ? await getInboxNotificationDetail({
          userId: user.id,
          notificationId: params.id,
        })
      : null;

    return (
      <NotificationsInboxView
        initialResult={initialResult}
        initialDetail={initialDetail}
        initialSelectedId={params.id ?? null}
      />
    );
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

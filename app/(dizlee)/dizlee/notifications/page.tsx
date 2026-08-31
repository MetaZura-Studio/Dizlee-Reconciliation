import { Suspense } from "react";
import { redirect } from "next/navigation";

import { NotificationsInboxView } from "@/components/dizlee/notifications-inbox-view";
import {
  getInboxNotificationDetail,
  listInboxNotifications,
  parseInboxFilters,
} from "@/lib/dizlee/notifications/inbox";
import { requireDizleeSession } from "@/lib/dizlee/auth";

type DizleeNotificationsPageProps = {
  searchParams: Promise<{
    tab?: string;
    page?: string;
    id?: string;
    unreadOnly?: string;
    filter?: string;
    search?: string;
  }>;
};

function buildRedirectQuery(
  params: Record<string, string | undefined>,
  tab?: string,
): string {
  const query = new URLSearchParams();
  if (tab) {
    query.set("tab", tab);
  }
  for (const [key, value] of Object.entries(params)) {
    if (value && key !== "tab") {
      query.set(key, value);
    }
  }
  const serialized = query.toString();
  return serialized ? `?${serialized}` : "";
}

export default async function DizleeNotificationsPage({
  searchParams,
}: DizleeNotificationsPageProps) {
  const user = await requireDizleeSession();
  if (!user) {
    return null;
  }

  const params = await searchParams;

  if (
    params.tab === "intimations" ||
    params.tab === "reminders" ||
    params.tab === "outbox" ||
    params.tab === "history"
  ) {
    const tab =
      params.tab === "history" || params.tab === "outbox"
        ? "outbox"
        : params.tab;
    redirect(`/dizlee/communications${buildRedirectQuery(params, tab)}`);
  }

  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value && key !== "tab" && key !== "id") {
      query.set(key, value);
    }
  }

  const inboxFilters = parseInboxFilters(query);
  const initialResult = await listInboxNotifications({
    userId: user.id,
    page: inboxFilters.page,
    readFilter: inboxFilters.readFilter,
    search: inboxFilters.search,
  });
  const initialDetail = params.id
    ? await getInboxNotificationDetail({
        userId: user.id,
        notificationId: params.id,
      })
    : null;

  return (
    <Suspense fallback={null}>
      <NotificationsInboxView
        key={inboxFilters.readFilter}
        initialResult={initialResult}
        initialDetail={initialDetail}
        initialSelectedId={params.id ?? null}
      />
    </Suspense>
  );
}

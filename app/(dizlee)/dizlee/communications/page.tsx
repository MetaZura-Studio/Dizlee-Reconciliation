import { redirect } from "next/navigation";
import { Suspense } from "react";

import { NotificationHistoryView } from "@/components/dizlee/notification-history-view";
import { IntimationsView } from "@/components/dizlee/intimations-view";
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
  getReminderSettings,
  listReminderLanes,
  parseReminderFilters,
} from "@/lib/dizlee/notifications/reminders";
import { getReportFilterOptions } from "@/lib/dizlee/reports-monitoring";
import { requireDizleeSession } from "@/lib/dizlee/auth";

type DizleeCommunicationsPageProps = {
  searchParams: Promise<{
    tab?: string;
    page?: string;
    id?: string;
    filter?: string;
    month?: string;
    year?: string;
    opcoId?: string;
    partnerId?: string;
    missing?: string;
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

export default async function DizleeCommunicationsPage({
  searchParams,
}: DizleeCommunicationsPageProps) {
  const user = await requireDizleeSession();
  if (!user) {
    return null;
  }

  const params = await searchParams;

  if (params.tab === "inbox") {
    redirect(`/dizlee/notifications${buildRedirectQuery(params, "inbox")}`);
  }

  if (params.tab === "history") {
    redirect(
      `/dizlee/communications${buildRedirectQuery(params, "outbox")}`,
    );
  }

  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value && key !== "tab" && key !== "id") {
      query.set(key, value);
    }
  }

  if (params.tab === "outbox") {
    const filters = parseNotificationHistoryFilters(query);
    const initialResult = await listNotificationHistory(filters);
    const initialDetail = params.id
      ? await getNotificationHistoryDetail(params.id)
      : null;

    return (
      <Suspense fallback={null}>
        <NotificationHistoryView
          key={filters.kind}
          initialResult={initialResult}
          initialDetail={initialDetail}
          initialSelectedId={params.id ?? null}
          initialKind={filters.kind}
        />
      </Suspense>
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

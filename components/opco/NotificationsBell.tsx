/**
 * OpCo floating notifications bell with dropdown list and deep links.
 */

"use client";

import {
  NotificationsBellDropdown,
  parseResultListItems,
  parseUnreadCountField,
} from "@/components/shared/notifications-bell-dropdown";

type NotificationsBellProps = {
  initialUnreadCount?: number;
};

export function NotificationsBell({
  initialUnreadCount = 0,
}: NotificationsBellProps) {
  return (
    <NotificationsBellDropdown
      portal="opco"
      inboxHref="/opco/notifications"
      listUrl="/api/opco/notifications?page=1&unreadOnly=false"
      detailUrl={(id) => `/api/opco/notifications/${id}`}
      unreadCountUrl="/api/opco/notifications/unread-count"
      inboxUpdatedEvent="opco-inbox-updated"
      initialUnreadCount={initialUnreadCount}
      parseUnreadCount={parseUnreadCountField}
      parseListItems={parseResultListItems}
    />
  );
}

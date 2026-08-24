/**
 * Partner floating notifications bell with dropdown list and deep links.
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
      portal="partner"
      inboxHref="/partner/notifications"
      listUrl="/api/partner/notifications?page=1&unreadOnly=false"
      detailUrl={(id) => `/api/partner/notifications/${id}`}
      unreadCountUrl="/api/partner/notifications/unread-count"
      inboxUpdatedEvent="partner-inbox-updated"
      initialUnreadCount={initialUnreadCount}
      parseUnreadCount={parseUnreadCountField}
      parseListItems={parseResultListItems}
    />
  );
}

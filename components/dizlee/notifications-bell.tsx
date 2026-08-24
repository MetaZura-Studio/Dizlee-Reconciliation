/**
 * Dizlee floating notifications bell with dropdown list and deep links.
 */

"use client";

import {
  NotificationsBellDropdown,
  parseDizleeInboxList,
  parseDizleeUnreadCount,
} from "@/components/shared/notifications-bell-dropdown";

type NotificationsBellProps = {
  initialUnreadCount?: number;
};

export function NotificationsBell({
  initialUnreadCount = 0,
}: NotificationsBellProps) {
  return (
    <NotificationsBellDropdown
      portal="dizlee"
      inboxHref="/dizlee/notifications?tab=inbox"
      listUrl="/api/dizlee/notifications/inbox?page=1&unreadOnly=false"
      detailUrl={(id) => `/api/dizlee/notifications/inbox/${id}`}
      unreadCountUrl="/api/dizlee/notifications/unread-count"
      inboxUpdatedEvent="dizlee-inbox-updated"
      initialUnreadCount={initialUnreadCount}
      parseUnreadCount={parseDizleeUnreadCount}
      parseListItems={parseDizleeInboxList}
    />
  );
}

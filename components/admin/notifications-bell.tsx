/**
 * Admin floating notifications bell with dropdown list and deep links.
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

export function AdminNotificationsBell({
  initialUnreadCount = 0,
}: NotificationsBellProps) {
  return (
    <NotificationsBellDropdown
      portal="admin"
      inboxHref="/admin/notifications"
      listUrl="/api/admin/notifications?page=1&unreadOnly=false"
      detailUrl={(id) => `/api/admin/notifications/${id}`}
      unreadCountUrl="/api/admin/notifications/unread-count"
      inboxUpdatedEvent="admin-inbox-updated"
      initialUnreadCount={initialUnreadCount}
      parseUnreadCount={parseUnreadCountField}
      parseListItems={parseResultListItems}
    />
  );
}

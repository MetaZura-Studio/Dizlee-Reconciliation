"use client";

import { PortalTabs } from "@/components/ui/portal-tabs";
import type { InboxReadFilter } from "@/lib/dizlee/notifications/inbox-filters";

type NotificationsInboxTabsProps = {
  active: InboxReadFilter;
};

const TABS: Array<{
  id: InboxReadFilter;
  label: string;
  href: string;
}> = [
  {
    id: "all",
    label: "All",
    href: "/dizlee/notifications",
  },
  {
    id: "read",
    label: "Read",
    href: "/dizlee/notifications?filter=read",
  },
  {
    id: "unread",
    label: "Unread only",
    href: "/dizlee/notifications?filter=unread",
  },
];

export function NotificationsInboxTabs({ active }: NotificationsInboxTabsProps) {
  return <PortalTabs tabs={TABS} active={active} />;
}

"use client";

import Link from "next/link";

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
  return (
    <div className="border-b border-border">
      <nav className="-mb-px flex flex-wrap gap-x-6 gap-y-2">
        {TABS.map((tab) => {
          const isActive = tab.id === active;

          return (
            <Link
              key={tab.id}
              href={tab.href}
              className={`border-b-2 px-1 pb-3 text-sm font-medium ${
                isActive
                  ? "border-primary text-foreground"
                  : "border-transparent text-foreground-subtle hover:text-foreground-muted"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

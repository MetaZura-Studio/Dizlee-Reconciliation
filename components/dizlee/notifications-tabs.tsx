"use client";

import Link from "next/link";

type NotificationsTabId =
  | "intimations"
  | "reminders"
  | "history"
  | "inbox";

type NotificationsTabsProps = {
  active: NotificationsTabId;
};

const TABS: Array<{
  id: NotificationsTabId;
  label: string;
  href: string;
  enabled: boolean;
}> = [
  {
    id: "intimations",
    label: "Intimations",
    href: "/dizlee/notifications",
    enabled: true,
  },
  {
    id: "reminders",
    label: "Reminders",
    href: "/dizlee/notifications?tab=reminders",
    enabled: true,
  },
  {
    id: "history",
    label: "History",
    href: "/dizlee/notifications?tab=history",
    enabled: true,
  },
  {
    id: "inbox",
    label: "Inbox",
    href: "/dizlee/notifications?tab=inbox",
    enabled: true,
  },
];

export function NotificationsTabs({ active }: NotificationsTabsProps) {
  return (
    <div className="border-b border-border">
      <nav className="-mb-px flex flex-wrap gap-x-6 gap-y-2">
        {TABS.map((tab) => {
          const isActive = tab.id === active;

          if (!tab.enabled) {
            return (
              <span
                key={tab.id}
                className="cursor-not-allowed border-b-2 border-transparent px-1 pb-3 text-sm font-medium text-foreground-subtle"
                title="Coming in a later feature"
              >
                {tab.label}
              </span>
            );
          }

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

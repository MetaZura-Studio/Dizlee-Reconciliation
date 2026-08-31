"use client";

import Link from "next/link";

import type { OutboxKindFilter } from "@/lib/dizlee/notifications/outbox-filters";

type CommunicationsOutboxTabsProps = {
  active: OutboxKindFilter;
};

const TABS: Array<{
  id: OutboxKindFilter;
  label: string;
  href: string;
}> = [
  {
    id: "all",
    label: "All",
    href: "/dizlee/communications?tab=outbox",
  },
  {
    id: "intimation",
    label: "Intimations",
    href: "/dizlee/communications?tab=outbox&filter=intimation",
  },
  {
    id: "reminder",
    label: "Reminders",
    href: "/dizlee/communications?tab=outbox&filter=reminder",
  },
  {
    id: "other",
    label: "Other",
    href: "/dizlee/communications?tab=outbox&filter=other",
  },
];

export function CommunicationsOutboxTabs({
  active,
}: CommunicationsOutboxTabsProps) {
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

"use client";

import Link from "next/link";

type CommunicationsTabId = "intimations" | "reminders" | "outbox";

type CommunicationsTabsProps = {
  active: CommunicationsTabId;
};

const TABS: Array<{
  id: CommunicationsTabId;
  label: string;
  href: string;
}> = [
  {
    id: "intimations",
    label: "Intimations",
    href: "/dizlee/communications",
  },
  {
    id: "reminders",
    label: "Reminders",
    href: "/dizlee/communications?tab=reminders",
  },
  {
    id: "outbox",
    label: "Outbox",
    href: "/dizlee/communications?tab=outbox",
  },
];

export function CommunicationsTabs({ active }: CommunicationsTabsProps) {
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

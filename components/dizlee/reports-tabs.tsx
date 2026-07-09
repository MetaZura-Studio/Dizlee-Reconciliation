"use client";

import Link from "next/link";

type ReportsTabsProps = {
  active: "reports" | "reupload" | "monitoring";
};

const TABS: Array<{
  id: ReportsTabsProps["active"];
  label: string;
  href?: string;
  disabled?: boolean;
}> = [
  { id: "reports", label: "Reports", href: "/dizlee/reports" },
  { id: "reupload", label: "Reupload requests", href: "/dizlee/reports/reupload" },
  {
    id: "monitoring",
    label: "Reports monitoring",
    href: "/dizlee/reports/monitoring",
  },
];

export function ReportsTabs({ active }: ReportsTabsProps) {
  return (
    <div className="border-b border-border">
      <nav className="-mb-px flex gap-6">
        {TABS.map((tab) => {
          const isActive = tab.id === active;

          if (tab.disabled || !tab.href) {
            return (
              <span
                key={tab.id}
                className={`border-b-2 px-1 pb-3 text-sm font-medium ${
                  isActive
                    ? "border-primary text-foreground"
                    : "cursor-not-allowed border-transparent text-foreground-subtle"
                }`}
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

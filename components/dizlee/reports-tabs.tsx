"use client";

import Link from "next/link";

type ReportsTabsProps = {
  active: "reports" | "reupload" | "monitoring";
};

const TABS: Array<{
  id: ReportsTabsProps["active"];
  label: string;
  href: string;
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
    <div className="mb-5 flex flex-wrap gap-2 border-b border-border pb-3">
      {TABS.map((tab) => {
        const isActive = tab.id === active;
        return (
          <Link
            key={tab.id}
            href={tab.href}
            className={
              isActive
                ? "rounded-full bg-primary-muted px-3.5 py-1.5 text-sm font-semibold text-primary"
                : "rounded-full px-3.5 py-1.5 text-sm font-medium text-foreground-muted hover:bg-surface-muted hover:text-foreground"
            }
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}

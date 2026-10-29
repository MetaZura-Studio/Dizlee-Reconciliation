/**
 * Shared portal tab strip — active tab uses a filled block so the current page is obvious.
 */

"use client";

import Link from "next/link";

export type PortalTabItem = {
  id: string;
  label: string;
  href: string;
};

type PortalTabsProps = {
  tabs: PortalTabItem[];
  active: string;
};

export function PortalTabs({ tabs, active }: PortalTabsProps) {
  return (
    <div className="mb-5 flex flex-wrap gap-2 border-b border-border pb-3">
      {tabs.map((tab) => {
        const isActive = tab.id === active;
        return (
          <Link
            key={tab.id}
            href={tab.href}
            className={
              isActive
                ? "rounded-lg border border-primary/25 bg-primary-muted px-3.5 py-1.5 text-sm font-semibold text-primary"
                : "rounded-lg border border-transparent px-3.5 py-1.5 text-sm font-medium text-foreground-muted hover:bg-surface-muted hover:text-foreground"
            }
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}

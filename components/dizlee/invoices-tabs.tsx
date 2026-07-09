"use client";

import Link from "next/link";

type InvoicesTabsProps = {
  active: "all" | "lifecycle" | "monitoring";
};

const TABS: Array<{
  id: InvoicesTabsProps["active"];
  label: string;
  href: string;
}> = [
  { id: "all", label: "All invoices", href: "/dizlee/invoices" },
  { id: "lifecycle", label: "Lifecycle tracker", href: "/dizlee/invoices/lifecycle" },
  {
    id: "monitoring",
    label: "Invoice monitoring",
    href: "/dizlee/invoices/monitoring",
  },
];

export function InvoicesTabs({ active }: InvoicesTabsProps) {
  return (
    <div className="border-b border-border">
      <nav className="-mb-px flex gap-6">
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

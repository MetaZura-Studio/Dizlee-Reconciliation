"use client";

import { PortalTabs } from "@/components/ui/portal-tabs";

type InvoicesTabsProps = {
  active: "all" | "partner-access" | "lifecycle" | "monitoring";
};

const TABS: Array<{
  id: InvoicesTabsProps["active"];
  label: string;
  href: string;
}> = [
  { id: "all", label: "All invoices", href: "/dizlee/invoices" },
  {
    id: "partner-access",
    label: "Partner upload access",
    href: "/dizlee/invoices/partner-access",
  },
  { id: "lifecycle", label: "Lifecycle tracker", href: "/dizlee/invoices/lifecycle" },
  {
    id: "monitoring",
    label: "Invoice monitoring",
    href: "/dizlee/invoices/monitoring",
  },
];

export function InvoicesTabs({ active }: InvoicesTabsProps) {
  return <PortalTabs tabs={TABS} active={active} />;
}

"use client";

import { PortalTabs } from "@/components/ui/portal-tabs";

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
  return <PortalTabs tabs={TABS} active={active} />;
}

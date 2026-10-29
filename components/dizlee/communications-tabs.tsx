"use client";

import { PortalTabs } from "@/components/ui/portal-tabs";

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
  return <PortalTabs tabs={TABS} active={active} />;
}

"use client";

import { PortalTabs } from "@/components/ui/portal-tabs";
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
  return <PortalTabs tabs={TABS} active={active} />;
}

/**
 * Static Dizlee sidebar navigation catalog and active-route matching.
 * Consumed by Dizlee layout and workspace shell components.
 */

export type DizleeNavItem = {
  label: string;
  href: string;
  description?: string;
  children?: DizleeNavItem[];
};

export const DIZLEE_NAV_ITEMS: DizleeNavItem[] = [
  { label: "Dashboard", href: "/dizlee" },
  {
    label: "Reports",
    href: "/dizlee/reports",
    description: "Report history, revenue share, and OpCo–Partner revenue",
    children: [
      {
        label: "Reports",
        href: "/dizlee/reports",
        description: "Reports history",
      },
      {
        label: "RS Reports",
        href: "/dizlee/revenue-share",
        description: "OpCo revenue share Excel reports",
      },
      {
        label: "Partner RS Reports",
        href: "/dizlee/partner-revenue-share",
        description: "Partner Revenue Share reports sent after reconciliation",
      },
      {
        label: "OpCo–Partner revenue",
        href: "/dizlee/period-revenue",
        description: "OpCo–Partner gross sales from OpCo reports",
      },
    ],
  },
  { label: "Invoices", href: "/dizlee/invoices" },
  { label: "Reconciliation", href: "/dizlee/reconciliation" },
  {
    label: "Communications",
    href: "/dizlee/communications",
    description: "Intimations and report reminders",
  },
  { label: "Notifications", href: "/dizlee/notifications" },
  {
    label: "Activity",
    href: "/dizlee/activity",
    description: "Monthly OpCo / Partner timeline",
  },
  {
    label: "Reporting",
    href: "/dizlee/reporting",
    description: "Monthly OpCo period scorecard",
  },
];

export function isDizleeNavActive(pathname: string, href: string): boolean {
  if (href === "/dizlee") {
    return pathname === "/dizlee";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export type DizleeNavItem = {
  label: string;
  href: string;
  description?: string;
};

export const DIZLEE_NAV_ITEMS: DizleeNavItem[] = [
  { label: "Dashboard", href: "/dizlee" },
  { label: "Reports", href: "/dizlee/reports", description: "Reports history" },
  { label: "Invoices", href: "/dizlee/invoices" },
  { label: "Reconciliation", href: "/dizlee/reconciliation" },
  { label: "Consolidation", href: "/dizlee/consolidation" },
  { label: "Notifications", href: "/dizlee/notifications" },
  {
    label: "Activity",
    href: "/dizlee/activity",
    description: "Monthly OpCo / Partner timeline",
  },
  { label: "Reporting", href: "/dizlee/reporting" },
];

export function isDizleeNavActive(pathname: string, href: string): boolean {
  if (href === "/dizlee") {
    return pathname === "/dizlee";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

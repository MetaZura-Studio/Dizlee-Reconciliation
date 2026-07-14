export type AdminNavIcon =
  | "audit"
  | "users"
  | "email-settings"
  | "email-templates"
  | "reminder"
  | "opcos"
  | "partners"
  | "opco-partners"
  | "tolerance"
  | "settings"
  | "currencies"
  | "bank";

export type AdminNavItem = {
  label: string;
  href: string;
  icon: AdminNavIcon;
  description: string;
  section: "main" | "footer";
  disabled?: boolean;
  children?: AdminNavItem[];
};

export const ADMIN_DEFAULT_ROUTE = "/admin/users";

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  {
    label: "Audit logs",
    href: "/admin/audit-logs",
    icon: "audit",
    description: "View and export platform audit events.",
    section: "main",
  },
  {
    label: "Users",
    href: "/admin/users",
    icon: "users",
    description: "Create, edit, and manage user accounts.",
    section: "main",
  },
  {
    label: "OpCos",
    href: "/admin/opcos",
    icon: "opcos",
    description: "Create and manage OpCo organizations.",
    section: "main",
  },
  {
    label: "Partners",
    href: "/admin/partners",
    icon: "partners",
    description: "Create and manage Partner organizations.",
    section: "main",
  },
  {
    label: "Email Templates",
    href: "/admin/email-templates",
    icon: "email-templates",
    description: "Manage email templates and version history.",
    section: "main",
  },
  {
    label: "OpCo partners",
    href: "/admin/opco-partners",
    icon: "opco-partners",
    description: "Configure OpCo and Partner relationships.",
    section: "main",
  },
  {
    label: "Reconciliation tolerance",
    href: "/admin/reconciliation-tolerance",
    icon: "tolerance",
    description: "Set the negligible reconciliation difference threshold.",
    section: "main",
  },
  {
    label: "Currencies & USD rates",
    href: "/admin/currencies",
    icon: "currencies",
    description: "Manage currencies and monthly USD exchange rates.",
    section: "main",
  },
  {
    label: "Invoice bank details",
    href: "/admin/invoice-bank-details",
    icon: "bank",
    description: "Set default invoice bank account details.",
    section: "main",
  },
  {
    label: "Settings",
    href: "/admin/email-settings",
    icon: "settings",
    description: "Email and reminder configuration.",
    section: "main",
    children: [
      {
        label: "Email Settings",
        href: "/admin/email-settings",
        icon: "email-settings",
        description: "Configure system email notification settings.",
        section: "main",
      },
      {
        label: "Reminder Settings",
        href: "/admin/reminder-settings",
        icon: "reminder",
        description: "Configure automatic submission reminder rules.",
        section: "main",
      },
    ],
  },
];

export const ADMIN_MAIN_NAV_ITEMS = ADMIN_NAV_ITEMS.filter(
  (item) => item.section === "main",
);

export const ADMIN_FOOTER_NAV_ITEMS = ADMIN_NAV_ITEMS.filter(
  (item) => item.section === "footer",
);

export function flattenAdminNavItems(items: AdminNavItem[]): AdminNavItem[] {
  const result: AdminNavItem[] = [];
  for (const item of items) {
    if (item.children?.length) {
      result.push(...flattenAdminNavItems(item.children));
    } else {
      result.push(item);
    }
  }
  return result;
}

export function getAdminNavItemForPath(pathname: string): AdminNavItem | undefined {
  return flattenAdminNavItems(ADMIN_NAV_ITEMS).find((item) =>
    isAdminNavActive(pathname, item.href),
  );
}

export function isAdminNavActive(pathname: string, href: string): boolean {
  if (href === "#") {
    return false;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

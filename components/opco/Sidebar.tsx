"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { SignOutButton } from "@/components/opco/SignOutButton";

type NavItem = {
  href: string;
  label: string;
  footer?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/opco", label: "Dashboard" },
  { href: "/opco/upload", label: "Upload Report" },
  { href: "/opco/reports", label: "Reports history" },
  { href: "/opco/invoices", label: "Invoices" },
  { href: "/opco/notifications", label: "Notifications" },
  { href: "/opco/settings", label: "Settings", footer: true },
];

function isActive(pathname: string, href: string) {
  if (href === "/opco") {
    return pathname === "/opco";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

type SidebarProps = {
  email: string;
};

export function Sidebar({ email }: SidebarProps) {
  const pathname = usePathname();
  const mainItems = NAV_ITEMS.filter((item) => !item.footer);
  const footerItems = NAV_ITEMS.filter((item) => item.footer);

  return (
    <aside className="flex w-56 flex-col border-r border-border bg-surface-muted p-4">
      <div>
        <p className="text-sm font-semibold">OpCo Portal</p>
        <p className="mt-1 text-xs text-foreground-subtle">Dizlee Reconciliation</p>
        <p className="mt-3 text-xs text-foreground-muted">{email}</p>
      </div>

      <nav className="mt-6 flex flex-1 flex-col gap-1 text-sm">
        {mainItems.map((item) => {
          const active = isActive(pathname, item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded px-2 py-1.5 ${
                active
                  ? "bg-primary-muted font-medium text-primary"
                  : "text-foreground-muted hover:bg-surface-muted hover:text-foreground"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-6 space-y-3 border-t border-border pt-4">
        {footerItems.map((item) => {
          const active = isActive(pathname, item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded px-2 py-1.5 text-sm ${
                active
                  ? "bg-primary-muted font-medium text-primary"
                  : "text-foreground-muted hover:bg-surface-muted hover:text-foreground"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
        <SignOutButton />
      </div>
    </aside>
  );
}

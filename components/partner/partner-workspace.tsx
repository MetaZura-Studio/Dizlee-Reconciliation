"use client";

import { AppShell, type AppShellNavItem } from "@/components/layout/app-shell";
import { NotificationsBell } from "@/components/partner/NotificationsBell";
import { SignOutButton } from "@/components/partner/SignOutButton";

const NAV: AppShellNavItem[] = [
  { href: "/partner", label: "Dashboard", icon: "home" },
  { href: "/partner/upload", label: "Upload Report", icon: "file" },
  { href: "/partner/reports", label: "Reports history", icon: "file" },
  { href: "/partner/invoices", label: "Invoices", icon: "file" },
  { href: "/partner/notifications", label: "Notifications", icon: "users" },
  {
    href: "/partner/settings",
    label: "Settings",
    icon: "settings",
    footer: true,
  },
];

type PartnerWorkspaceProps = {
  email: string;
  unreadCount: number;
  children: React.ReactNode;
};

export function PartnerWorkspace({
  email,
  unreadCount,
  children,
}: PartnerWorkspaceProps) {
  return (
    <AppShell
      brand="Partner Portal"
      subtitle="Dizlee Reconciliation"
      storageKey="partner-sidebar-collapsed"
      navItems={NAV}
      userLabel={email}
      headerRight={
        <>
          <NotificationsBell initialUnreadCount={unreadCount} />
          <SignOutButton />
        </>
      }
    >
      {children}
    </AppShell>
  );
}

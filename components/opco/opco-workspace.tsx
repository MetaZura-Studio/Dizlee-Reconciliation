"use client";

import { AppShell, type AppShellNavItem } from "@/components/layout/app-shell";
import { NotificationsBell } from "@/components/opco/NotificationsBell";
import { SignOutButton } from "@/components/opco/SignOutButton";

const NAV: AppShellNavItem[] = [
  { href: "/opco", label: "Dashboard", icon: "home" },
  { href: "/opco/upload", label: "Upload Report", icon: "file" },
  { href: "/opco/reports", label: "Reports history", icon: "file" },
  { href: "/opco/invoices", label: "Invoices", icon: "file" },
  { href: "/opco/notifications", label: "Notifications", icon: "users" },
  { href: "/opco/settings", label: "Settings", icon: "settings", footer: true },
];

type OpcoWorkspaceProps = {
  email: string;
  unreadCount: number;
  children: React.ReactNode;
};

export function OpcoWorkspace({
  email,
  unreadCount,
  children,
}: OpcoWorkspaceProps) {
  return (
    <AppShell
      brand="OpCo Portal"
      subtitle="Dizlee Reconciliation"
      storageKey="opco-sidebar-collapsed"
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

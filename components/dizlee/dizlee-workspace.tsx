"use client";

import { AppShell, type AppShellNavItem } from "@/components/layout/app-shell";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { NotificationsBell } from "@/components/dizlee/notifications-bell";
import { DIZLEE_NAV_ITEMS } from "@/lib/dizlee/navigation";

const NAV: AppShellNavItem[] = DIZLEE_NAV_ITEMS.map((item, index) => ({
  ...item,
  icon: index === 0 ? "home" : "file",
}));

type DizleeWorkspaceProps = {
  email: string;
  unreadCount: number;
  children: React.ReactNode;
};

export function DizleeWorkspace({
  email,
  unreadCount,
  children,
}: DizleeWorkspaceProps) {
  return (
    <AppShell
      brand="Dizlee"
      subtitle="Reconciliation Platform"
      storageKey="dizlee-sidebar-collapsed"
      navItems={NAV}
      userLabel={email}
      headerRight={
        <>
          <NotificationsBell initialUnreadCount={unreadCount} />
          <SignOutButton className="inline-flex h-10 items-center rounded-2xl border border-border bg-surface px-3 text-sm font-semibold text-foreground shadow-[var(--shadow-sm)] hover:bg-surface-muted" />
        </>
      }
    >
      {children}
    </AppShell>
  );
}

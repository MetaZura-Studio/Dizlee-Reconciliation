/**
 * OpCo portal shell with navigation, notifications bell, and sign-out.
 * Frames dashboard, nested Reports (upload / history / re-upload), invoices, and inbox.
 */

"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { AppShell, type AppShellNavItem } from "@/components/layout/app-shell";
import { NotificationsBell } from "@/components/opco/NotificationsBell";
import { IconChevronLeft, IconChevronRight } from "@/components/ui/icons";
import { cn, ui } from "@/lib/ui/classes";

type OpcoWorkspaceProps = {
  name?: string | null;
  email: string;
  unreadCount: number;
  children: React.ReactNode;
};

function OpcoProfileMenu({
  name,
  email,
  collapsed,
  onToggleCollapse,
}: {
  name?: string | null;
  email: string;
  collapsed: boolean;
  onToggleCollapse: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const displayName = name?.trim() || "OpCo User";
  const initial = displayName.charAt(0).toUpperCase() || "O";

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div
      className={cn(
        "relative flex w-full min-w-0 items-center gap-1",
        collapsed && "flex-col gap-2",
      )}
      ref={menuRef}
    >
      <button
        type="button"
        onClick={() => setMenuOpen((open) => !open)}
        className={cn(
          "flex min-w-0 flex-1 items-center gap-3 rounded-2xl px-3 py-2 text-left transition-colors hover:bg-surface-muted",
          collapsed && "justify-center px-2",
        )}
        aria-expanded={menuOpen}
        aria-haspopup="menu"
        aria-label={`${displayName} menu`}
        title={displayName}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground shadow-[var(--shadow-sm)]">
          {initial}
        </span>
        {!collapsed ? (
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium text-foreground">
              {displayName}
            </span>
            <span className="block truncate text-xs text-foreground-subtle">
              {email}
            </span>
          </span>
        ) : null}
      </button>
      <button
        type="button"
        onClick={onToggleCollapse}
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl text-foreground-muted transition-colors hover:bg-surface-muted hover:text-foreground"
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? <IconChevronRight /> : <IconChevronLeft />}
      </button>
      {menuOpen ? (
        <div
          className={cn(
            ui.dropdown,
            "bottom-full left-0 right-auto top-auto mb-2 mt-0 min-w-[14rem]",
          )}
          role="menu"
        >
          <div className="border-b border-border px-3 py-2">
            <p className="truncate text-sm font-medium">{displayName}</p>
            <p className="truncate text-xs text-foreground-subtle">{email}</p>
          </div>
          <Link
            href="/change-password"
            className="block px-3 py-2 text-sm text-foreground-muted hover:bg-surface-muted"
            role="menuitem"
            onClick={() => setMenuOpen(false)}
          >
            Change password
          </Link>
          <div className="border-t border-border px-2 py-1">
            <SignOutButton />
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function OpcoWorkspace({
  name,
  email,
  unreadCount,
  children,
}: OpcoWorkspaceProps) {
  const navItems = useMemo<AppShellNavItem[]>(
    () => [
      { href: "/opco", label: "Dashboard", icon: "home" },
      {
        href: "/opco/reports",
        label: "Reports",
        icon: "file",
        children: [
          { href: "/opco/upload", label: "Upload Report", icon: "file" },
          { href: "/opco/reports", label: "Report History", icon: "file" },
        ],
      },
      { href: "/opco/invoices", label: "Invoices", icon: "invoice" },
      {
        href: "/opco/notifications",
        label: "Notifications",
        icon: "bell",
        badge: unreadCount > 0 ? unreadCount : undefined,
      },
      { href: "/opco/settings", label: "Settings", icon: "settings", footer: true },
    ],
    [unreadCount],
  );

  return (
    <AppShell
      brand="OpCo Portal"
      subtitle="Dizlee Reconciliation"
      storageKey="opco-sidebar-collapsed"
      navItems={navItems}
      headerRight={<NotificationsBell initialUnreadCount={unreadCount} />}
      footerSlot={(collapsed, toggleCollapsed) => (
        <OpcoProfileMenu
          name={name}
          email={email}
          collapsed={collapsed}
          onToggleCollapse={toggleCollapsed}
        />
      )}
    >
      {children}
    </AppShell>
  );
}

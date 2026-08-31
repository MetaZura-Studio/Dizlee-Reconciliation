"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { NotificationsBell } from "@/components/dizlee/notifications-bell";
import { AppShell, type AppShellNavItem } from "@/components/layout/app-shell";
import { IconChevronLeft, IconChevronRight } from "@/components/ui/icons";
import { DIZLEE_NAV_ITEMS } from "@/lib/dizlee/navigation";
import { cn, ui } from "@/lib/ui/classes";

function iconForHref(href: string): AppShellNavItem["icon"] {
  switch (href) {
    case "/dizlee":
      return "home";
    case "/dizlee/reports":
      return "file";
    case "/dizlee/invoices":
      return "invoice";
    case "/dizlee/reconciliation":
      return "compare";
    case "/dizlee/consolidation":
      return "layers";
    case "/dizlee/communications":
      return "layers";
    case "/dizlee/notifications":
      return "bell";
    case "/dizlee/activity":
      return "layers";
    case "/dizlee/reporting":
      return "chart";
    default:
      return "file";
  }
}

type DizleeWorkspaceProps = {
  name: string | null;
  email: string;
  unreadCount: number;
  children: React.ReactNode;
};

function DizleeProfileMenu({
  name,
  email,
  collapsed,
  onToggleCollapse,
}: {
  name: string | null;
  email: string;
  collapsed: boolean;
  onToggleCollapse: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const displayName = name?.trim() || "Dizlee User";
  const initial = displayName.charAt(0).toUpperCase() || "D";

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

export function DizleeWorkspace({
  name,
  email,
  unreadCount: initialUnreadCount,
  children,
}: DizleeWorkspaceProps) {
  const [fetchedUnread, setFetchedUnread] = useState<number | null>(null);
  const unreadCount = fetchedUnread ?? initialUnreadCount;

  const refreshCount = useCallback(async () => {
    try {
      const response = await fetch("/api/dizlee/notifications/unread-count");
      const payload = await response.json();
      if (response.ok) {
        setFetchedUnread((payload.data as { count: number }).count);
      }
    } catch {
      // Ignore refresh errors silently.
    }
  }, []);

  useEffect(() => {
    const handleFocus = () => {
      void refreshCount();
    };
    const handleInboxUpdated = () => {
      void refreshCount();
    };

    window.addEventListener("focus", handleFocus);
    window.addEventListener("dizlee-inbox-updated", handleInboxUpdated);
    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("dizlee-inbox-updated", handleInboxUpdated);
    };
  }, [refreshCount]);

  const navItems = useMemo<AppShellNavItem[]>(
    () =>
      DIZLEE_NAV_ITEMS.map((item) => ({
        ...item,
        href:
          item.href === "/dizlee/notifications"
            ? "/dizlee/notifications?tab=inbox"
            : item.href,
        icon: iconForHref(item.href),
        badge:
          item.href === "/dizlee/notifications" && unreadCount > 0
            ? unreadCount
            : undefined,
      })),
    [unreadCount],
  );

  return (
    <AppShell
      brand="Dizlee"
      subtitle="Reconciliation Platform"
      storageKey="dizlee-sidebar-collapsed"
      navItems={navItems}
      headerRight={<NotificationsBell initialUnreadCount={unreadCount} />}
      footerSlot={(collapsed, toggleCollapsed) => (
        <DizleeProfileMenu
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

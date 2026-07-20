"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { AppShell, type AppShellNavItem } from "@/components/layout/app-shell";
import {
  ADMIN_FOOTER_NAV_ITEMS,
  ADMIN_MAIN_NAV_ITEMS,
} from "@/lib/admin/navigation";
import type { AdminSessionUser } from "@/lib/admin/auth";
import { cn, ui } from "@/lib/ui/classes";

function mapIcon(icon: string): AppShellNavItem["icon"] {
  if (icon === "dashboard") {
    return "home";
  }
  if (icon === "users" || icon === "partners" || icon === "opcos" || icon === "opco-partners") {
    return "users";
  }
  if (icon === "settings" || icon === "email-settings" || icon === "reminder" || icon === "tolerance") {
    return "settings";
  }
  if (icon === "audit") {
    return "home";
  }
  return "file";
}

function mapNavItem(item: {
  label: string;
  href: string;
  disabled?: boolean;
  icon: string;
  children?: Array<{
    label: string;
    href: string;
    disabled?: boolean;
    icon: string;
  }>;
}): AppShellNavItem {
  return {
    label: item.label,
    href: item.href,
    disabled: item.disabled,
    icon: mapIcon(item.icon),
    children: item.children?.map(mapNavItem),
  };
}

const NAV: AppShellNavItem[] = [
  ...ADMIN_MAIN_NAV_ITEMS.map(mapNavItem),
  ...ADMIN_FOOTER_NAV_ITEMS.map((item) => ({
    ...mapNavItem(item),
    footer: true as const,
  })),
];

type AdminWorkspaceProps = {
  user: AdminSessionUser;
  children: React.ReactNode;
};

function AdminProfileMenu({
  user,
  collapsed,
}: {
  user: AdminSessionUser;
  collapsed: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const displayName = user.name?.trim() || "Admin";
  const initial = displayName.charAt(0).toUpperCase() || "A";

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
    <div className="relative w-full min-w-0" ref={menuRef}>
      <button
        type="button"
        onClick={() => setMenuOpen((open) => !open)}
        className={cn(
          "flex w-full min-w-0 items-center gap-3 rounded-2xl px-3 py-2 text-left transition-colors hover:bg-surface-muted",
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
              {user.email}
            </span>
          </span>
        ) : null}
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
            <p className="truncate text-xs text-foreground-subtle">{user.email}</p>
          </div>
          <Link
            href="/admin/change-password"
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

export function AdminWorkspace({ user, children }: AdminWorkspaceProps) {
  return (
    <AppShell
      brand=""
      subtitle="Admin workspace"
      storageKey="admin-sidebar-collapsed"
      navItems={NAV}
      footerSlot={(collapsed) => (
        <AdminProfileMenu user={user} collapsed={collapsed} />
      )}
    >
      {children}
    </AppShell>
  );
}

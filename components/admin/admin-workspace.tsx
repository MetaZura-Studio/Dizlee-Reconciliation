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
import { ui } from "@/lib/ui/classes";

function mapIcon(icon: string): AppShellNavItem["icon"] {
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

const NAV: AppShellNavItem[] = [
  ...ADMIN_MAIN_NAV_ITEMS.map((item) => ({
    label: item.label,
    href: item.href,
    disabled: item.disabled,
    icon: mapIcon(item.icon),
  })),
  ...ADMIN_FOOTER_NAV_ITEMS.map((item) => ({
    label: item.label,
    href: item.href,
    disabled: item.disabled,
    icon: mapIcon(item.icon),
    footer: true as const,
  })),
];

type AdminWorkspaceProps = {
  user: AdminSessionUser;
  children: React.ReactNode;
};

function AdminProfileMenu({ user }: { user: AdminSessionUser }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const displayName = user.name?.trim() || "Admin";

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
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setMenuOpen((open) => !open)}
        className="flex h-10 items-center gap-2 rounded-2xl border border-border bg-surface px-3 text-sm font-medium shadow-[var(--shadow-sm)] hover:bg-surface-muted"
        aria-expanded={menuOpen}
        aria-haspopup="menu"
      >
        <span className="max-w-[10rem] truncate">{displayName}</span>
      </button>
      {menuOpen ? (
        <div className={ui.dropdown} role="menu">
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
      brand="Reconcile"
      subtitle="Admin workspace"
      storageKey="admin-sidebar-collapsed"
      navItems={NAV}
      userLabel={user.email}
      headerRight={<AdminProfileMenu user={user} />}
    >
      {children}
    </AppShell>
  );
}

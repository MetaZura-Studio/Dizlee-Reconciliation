"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { AdminNavIconGlyph } from "@/components/admin/nav-icons";
import {
  ADMIN_FOOTER_NAV_ITEMS,
  ADMIN_MAIN_NAV_ITEMS,
  type AdminNavItem,
  isAdminNavActive,
} from "@/lib/admin/navigation";

const SIDEBAR_COLLAPSED_KEY = "admin-sidebar-collapsed";

type AdminSidebarProps = {
  collapsed: boolean;
  onToggleCollapsed: () => void;
};

function NavLink({
  item,
  collapsed,
  active,
}: {
  item: AdminNavItem;
  collapsed: boolean;
  active: boolean;
}) {
  const baseClass = `flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
    active
      ? "bg-primary-muted font-medium text-primary"
      : "text-foreground-muted hover:bg-surface-muted hover:text-foreground"
  }`;

  const content = (
    <>
      <AdminNavIconGlyph name={item.icon} className="h-5 w-5 shrink-0" />
      {!collapsed ? <span className="truncate">{item.label}</span> : null}
    </>
  );

  if (item.disabled) {
    return (
      <span
        title={item.label}
        aria-disabled="true"
        className={`${baseClass} cursor-not-allowed opacity-40`}
      >
        {content}
      </span>
    );
  }

  return (
    <Link
      href={item.href}
      title={collapsed ? item.label : undefined}
      className={baseClass}
      aria-current={active ? "page" : undefined}
    >
      {content}
    </Link>
  );
}

export function AdminSidebar({
  collapsed,
  onToggleCollapsed,
}: AdminSidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={`hidden shrink-0 flex-col border-r border-border bg-surface-muted lg:flex ${
        collapsed ? "w-[4.5rem]" : "w-64"
      }`}
    >
      <div className={`border-b border-border p-4 ${collapsed ? "px-3" : ""}`}>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">
            D
          </div>
          {!collapsed ? (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">Reconcile</p>
              <p className="truncate text-xs text-foreground-subtle">Admin workspace</p>
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-3">
        {!collapsed ? (
          <p className="px-3 pb-2 text-[11px] font-semibold tracking-wider text-foreground-subtle uppercase">
            Navigation
          </p>
        ) : null}

        <nav className="space-y-1">
          {ADMIN_MAIN_NAV_ITEMS.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              collapsed={collapsed}
              active={isAdminNavActive(pathname, item.href)}
            />
          ))}
        </nav>

        <div className="mt-auto space-y-1 border-t border-border pt-4">
          {ADMIN_FOOTER_NAV_ITEMS.map((item) => (
            <NavLink
              key={item.label}
              item={item}
              collapsed={collapsed}
              active={isAdminNavActive(pathname, item.href)}
            />
          ))}
        </div>
      </div>

      <div className="border-t border-border p-3">
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="flex w-full items-center justify-center rounded-md px-3 py-2 text-xs font-medium text-foreground-muted hover:bg-surface-muted hover:text-foreground"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? "Expand" : "Collapse"}
        </button>
      </div>
    </aside>
  );
}

const collapsedListeners = new Set<() => void>();

export function subscribeAdminSidebarCollapsed(listener: () => void): () => void {
  collapsedListeners.add(listener);
  return () => collapsedListeners.delete(listener);
}

export function getAdminSidebarCollapsedSnapshot(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true";
}

export function getAdminSidebarCollapsedServerSnapshot(): boolean {
  return false;
}

export function setAdminSidebarCollapsed(collapsed: boolean): void {
  window.localStorage.setItem(
    SIDEBAR_COLLAPSED_KEY,
    collapsed ? "true" : "false",
  );
  collapsedListeners.forEach((listener) => listener());
}

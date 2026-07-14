"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { AdminNavIconGlyph } from "@/components/admin/nav-icons";
import { DizleeLogo } from "@/components/brand/dizlee-logo";
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
  nested = false,
}: {
  item: AdminNavItem;
  collapsed: boolean;
  active: boolean;
  nested?: boolean;
}) {
  const baseClass = `flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
    active
      ? "bg-primary-muted font-medium text-primary"
      : "text-foreground-muted hover:bg-surface-muted hover:text-foreground"
  } ${nested && !collapsed ? "pl-9" : ""} ${collapsed ? "justify-center" : ""}`;

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

function NavGroup({
  item,
  collapsed,
  pathname,
}: {
  item: AdminNavItem;
  collapsed: boolean;
  pathname: string;
}) {
  const children = item.children ?? [];
  const childActive = children.some((child) =>
    isAdminNavActive(pathname, child.href),
  );
  const [open, setOpen] = useState(childActive);

  useEffect(() => {
    if (childActive) {
      setOpen(true);
    }
  }, [childActive]);

  if (collapsed) {
    return (
      <NavLink item={item} collapsed active={childActive} />
    );
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
          childActive
            ? "bg-primary-muted font-medium text-primary"
            : "text-foreground-muted hover:bg-surface-muted hover:text-foreground"
        }`}
      >
        <AdminNavIconGlyph name={item.icon} className="h-5 w-5 shrink-0" />
        <span className="min-w-0 flex-1 truncate text-left">{item.label}</span>
        <span className={`text-xs transition-transform ${open ? "rotate-90" : ""}`}>
          ›
        </span>
      </button>
      {open
        ? children.map((child) => (
            <NavLink
              key={child.href}
              item={child}
              collapsed={collapsed}
              active={isAdminNavActive(pathname, child.href)}
              nested
            />
          ))
        : null}
    </div>
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
        <div className={`flex items-center gap-3 ${collapsed ? "justify-center" : ""}`}>
          {collapsed ? (
            <DizleeLogo variant="mark" className="h-9 w-9 rounded-md" />
          ) : (
            <div className="min-w-0 space-y-1">
              <DizleeLogo variant="full" />
              <p className="truncate text-xs text-foreground-subtle">Admin workspace</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-3">
        {!collapsed ? (
          <p className="px-3 pb-2 text-[11px] font-semibold tracking-wider text-foreground-subtle uppercase">
            Navigation
          </p>
        ) : null}

        <nav className="space-y-1">
          {ADMIN_MAIN_NAV_ITEMS.map((item) =>
            item.children?.length ? (
              <NavGroup
                key={item.label}
                item={item}
                collapsed={collapsed}
                pathname={pathname}
              />
            ) : (
              <NavLink
                key={item.href}
                item={item}
                collapsed={collapsed}
                active={isAdminNavActive(pathname, item.href)}
              />
            ),
          )}
        </nav>

        {ADMIN_FOOTER_NAV_ITEMS.length > 0 ? (
          <div className="mt-auto space-y-1 border-t border-border pt-4">
            {ADMIN_FOOTER_NAV_ITEMS.map((item) =>
              item.children?.length ? (
                <NavGroup
                  key={item.label}
                  item={item}
                  collapsed={collapsed}
                  pathname={pathname}
                />
              ) : (
                <NavLink
                  key={item.label}
                  item={item}
                  collapsed={collapsed}
                  active={isAdminNavActive(pathname, item.href)}
                />
              ),
            )}
          </div>
        ) : (
          <div className="mt-auto" />
        )}
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

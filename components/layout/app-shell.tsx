"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore, type ReactNode } from "react";

import {
  IconChevronLeft,
  IconChevronRight,
  IconFile,
  IconHome,
  IconSearch,
  IconSettings,
  IconUsers,
} from "@/components/ui/icons";
import { cn, ui } from "@/lib/ui/classes";

export type AppShellNavItem = {
  label: string;
  href: string;
  icon?: "home" | "file" | "users" | "settings";
  disabled?: boolean;
  footer?: boolean;
};

type AppShellProps = {
  brand: string;
  subtitle: string;
  storageKey: string;
  navItems: AppShellNavItem[];
  userLabel?: string;
  headerLeft?: ReactNode;
  headerRight?: ReactNode;
  footerSlot?: ReactNode;
  children: ReactNode;
};

function iconFor(name: AppShellNavItem["icon"]) {
  switch (name) {
    case "file":
      return IconFile;
    case "users":
      return IconUsers;
    case "settings":
      return IconSettings;
    case "home":
    default:
      return IconHome;
  }
}

function createCollapsedStore(storageKey: string) {
  let collapsed = false;
  const listeners = new Set<() => void>();

  function read() {
    if (typeof window === "undefined") {
      return false;
    }
    return window.localStorage.getItem(storageKey) === "1";
  }

  function emit() {
    for (const listener of listeners) {
      listener();
    }
  }

  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot() {
      collapsed = read();
      return collapsed;
    },
    getServerSnapshot() {
      return false;
    },
    setCollapsed(next: boolean) {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(storageKey, next ? "1" : "0");
      }
      collapsed = next;
      emit();
    },
  };
}

const stores = new Map<string, ReturnType<typeof createCollapsedStore>>();

function getStore(storageKey: string) {
  let store = stores.get(storageKey);
  if (!store) {
    store = createCollapsedStore(storageKey);
    stores.set(storageKey, store);
  }
  return store;
}

function isNavActive(pathname: string, href: string, rootHref: string) {
  if (href === rootHref) {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({
  brand,
  subtitle,
  storageKey,
  navItems,
  userLabel,
  headerLeft,
  headerRight,
  footerSlot,
  children,
}: AppShellProps) {
  const pathname = usePathname();
  const store = getStore(storageKey);
  const collapsed = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  );

  const rootHref = navItems.find((item) => !item.footer)?.href ?? "/";
  const mainItems = navItems.filter((item) => !item.footer);
  const footerItems = navItems.filter((item) => item.footer);

  return (
    <div className="min-h-screen bg-canvas p-3 sm:p-4">
      <div className="mx-auto flex min-h-[calc(100vh-1.5rem)] max-w-[1600px] gap-3 sm:min-h-[calc(100vh-2rem)] sm:gap-4">
        <aside
          className={cn(
            ui.sidebar,
            "hidden min-h-full transition-[width] duration-200 lg:flex",
            collapsed ? "w-20" : "w-72",
          )}
        >
          <div className={cn("border-b border-border p-4", collapsed && "px-3")}>
            <div className="flex items-center gap-3">
              <div className={ui.logoChip}>D</div>
              {!collapsed ? (
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {brand}
                  </p>
                  <p className="truncate text-xs text-foreground-subtle">
                    {subtitle}
                  </p>
                </div>
              ) : null}
            </div>
            {userLabel && !collapsed ? (
              <p className="mt-3 truncate text-xs text-foreground-muted">{userLabel}</p>
            ) : null}
          </div>

          <nav className="flex flex-1 flex-col gap-1 p-3">
            {mainItems.map((item) => {
              const active = isNavActive(pathname, item.href, rootHref);
              const Icon = iconFor(item.icon);
              const className = cn(
                active ? ui.navItemActive : ui.navItem,
                item.disabled && "cursor-not-allowed opacity-40",
                collapsed && "justify-center px-2",
              );
              const content = (
                <>
                  <Icon className="h-[18px] w-[18px] shrink-0" />
                  {!collapsed ? <span className="truncate">{item.label}</span> : null}
                </>
              );

              if (item.disabled) {
                return (
                  <span key={item.href} title={item.label} className={className}>
                    {content}
                  </span>
                );
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  className={className}
                  aria-current={active ? "page" : undefined}
                >
                  {content}
                </Link>
              );
            })}
          </nav>

          <div className="space-y-2 border-t border-border p-3">
            {footerItems.map((item) => {
              const active = isNavActive(pathname, item.href, rootHref);
              const Icon = iconFor(item.icon ?? "settings");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    active ? ui.navItemActive : ui.navItem,
                    collapsed && "justify-center px-2",
                  )}
                >
                  <Icon className="h-[18px] w-[18px] shrink-0" />
                  {!collapsed ? <span className="truncate">{item.label}</span> : null}
                </Link>
              );
            })}
            {footerSlot}
            <button
              type="button"
              onClick={() => store.setCollapsed(!collapsed)}
              className={cn(ui.navItem, collapsed && "justify-center px-2")}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? <IconChevronRight /> : <IconChevronLeft />}
              {!collapsed ? <span>Collapse</span> : null}
            </button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col gap-3 sm:gap-4">
          <header
            className={cn(
              ui.header,
              "relative z-40 flex items-center justify-between gap-4 px-4 py-3 sm:px-5",
            )}
          >
            <div className="flex min-w-0 items-center gap-3">
              {headerLeft ?? (
                <div className="flex h-10 items-center gap-2 rounded-2xl border border-border bg-surface px-3 text-sm text-foreground-subtle">
                  <IconSearch className="h-4 w-4" />
                  <span className="hidden sm:inline">Search workspace</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 sm:gap-3">{headerRight}</div>
          </header>
          <main className="min-h-0 flex-1 overflow-auto rounded-[28px] border border-border bg-white/50 p-4 shadow-[var(--shadow-sm)] backdrop-blur-sm sm:p-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

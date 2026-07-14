"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import {
  IconBell,
  IconChart,
  IconChevronLeft,
  IconChevronRight,
  IconCompare,
  IconFile,
  IconHome,
  IconInvoice,
  IconLayers,
  IconSettings,
  IconUsers,
} from "@/components/ui/icons";
import { DizleeLogo } from "@/components/brand/dizlee-logo";
import { cn, ui } from "@/lib/ui/classes";

export type AppShellNavIcon =
  | "home"
  | "file"
  | "users"
  | "settings"
  | "bell"
  | "invoice"
  | "layers"
  | "chart"
  | "compare";

export type AppShellNavItem = {
  label: string;
  href: string;
  icon?: AppShellNavIcon;
  disabled?: boolean;
  footer?: boolean;
  badge?: number;
  children?: AppShellNavItem[];
};

type AppShellProps = {
  brand: string;
  subtitle: string;
  storageKey: string;
  navItems: AppShellNavItem[];
  userLabel?: string;
  headerLeft?: ReactNode;
  headerRight?: ReactNode;
  footerSlot?: ReactNode | ((collapsed: boolean) => ReactNode);
  children: ReactNode;
};

function NavIcon({
  name,
  className,
}: {
  name?: AppShellNavIcon;
  className?: string;
}) {
  switch (name) {
    case "file":
      return <IconFile className={className} />;
    case "users":
      return <IconUsers className={className} />;
    case "settings":
      return <IconSettings className={className} />;
    case "bell":
      return <IconBell className={className} />;
    case "invoice":
      return <IconInvoice className={className} />;
    case "layers":
      return <IconLayers className={className} />;
    case "chart":
      return <IconChart className={className} />;
    case "compare":
      return <IconCompare className={className} />;
    case "home":
    default:
      return <IconHome className={className} />;
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
  const pathOnly = href.split("?")[0] ?? href;
  const rootPathOnly = rootHref.split("?")[0] ?? rootHref;
  if (pathOnly === rootPathOnly) {
    return pathname === pathOnly;
  }
  return pathname === pathOnly || pathname.startsWith(`${pathOnly}/`);
}

function NavLinkItem({
  item,
  pathname,
  rootHref,
  collapsed,
  nested = false,
}: {
  item: AppShellNavItem;
  pathname: string;
  rootHref: string;
  collapsed: boolean;
  nested?: boolean;
}) {
  const active = isNavActive(pathname, item.href, rootHref);
  const badgeCount = item.badge && item.badge > 0 ? item.badge : 0;
  const className = cn(
    active ? ui.navItemActive : ui.navItem,
    item.disabled && "cursor-not-allowed opacity-40",
    collapsed && "justify-center px-2",
    nested && !collapsed && "pl-10",
  );
  const badge = badgeCount > 0 ? (
    <span
      className={cn(
        "flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1.5 text-[10px] font-semibold text-primary-foreground",
        collapsed && "absolute -right-1 -top-1 h-4 min-w-4 px-1",
      )}
    >
      {badgeCount > 9 ? "9+" : badgeCount}
    </span>
  ) : null;

  const content = collapsed ? (
    <span className="relative inline-flex">
      <NavIcon name={item.icon} className="h-[18px] w-[18px] shrink-0" />
      {badge}
    </span>
  ) : (
    <>
      <NavIcon name={item.icon} className="h-[18px] w-[18px] shrink-0" />
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {badge}
    </>
  );

  if (item.disabled) {
    return (
      <span title={item.label} className={className}>
        {content}
      </span>
    );
  }

  return (
    <Link
      href={item.href}
      title={
        collapsed
          ? badgeCount > 0
            ? `${item.label}, ${badgeCount} unread`
            : item.label
          : undefined
      }
      className={className}
      aria-current={active ? "page" : undefined}
      aria-label={
        badgeCount > 0 ? `${item.label}, ${badgeCount} unread` : undefined
      }
    >
      {content}
    </Link>
  );
}

function NavGroupItem({
  item,
  pathname,
  rootHref,
  collapsed,
}: {
  item: AppShellNavItem;
  pathname: string;
  rootHref: string;
  collapsed: boolean;
}) {
  const children = item.children ?? [];
  const childActive = children.some((child) =>
    isNavActive(pathname, child.href, rootHref),
  );
  const [userOpen, setUserOpen] = useState(false);
  const open = childActive || userOpen;

  if (collapsed) {
    return (
      <Link
        href={item.href}
        title={item.label}
        className={cn(
          childActive ? ui.navItemActive : ui.navItem,
          "justify-center px-2",
        )}
        aria-current={childActive ? "page" : undefined}
      >
        <NavIcon name={item.icon} className="h-[18px] w-[18px] shrink-0" />
      </Link>
    );
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={() => {
          if (childActive) {
            return;
          }
          setUserOpen((value) => !value);
        }}
        className={cn(
          childActive ? ui.navItemActive : ui.navItem,
          "w-full",
        )}
        aria-expanded={open}
      >
        <NavIcon name={item.icon} className="h-[18px] w-[18px] shrink-0" />
        <span className="min-w-0 flex-1 truncate text-left">{item.label}</span>
        <IconChevronRight
          className={cn(
            "h-4 w-4 shrink-0 transition-transform",
            open && "rotate-90",
          )}
        />
      </button>
      {open
        ? children.map((child) => (
            <NavLinkItem
              key={`${child.label}-${child.href}`}
              item={child}
              pathname={pathname}
              rootHref={rootHref}
              collapsed={collapsed}
              nested
            />
          ))
        : null}
    </div>
  );
}

function renderNavItem(
  item: AppShellNavItem,
  pathname: string,
  rootHref: string,
  collapsed: boolean,
) {
  if (item.children?.length) {
    return (
      <NavGroupItem
        key={`${item.label}-${item.href}`}
        item={item}
        pathname={pathname}
        rootHref={rootHref}
        collapsed={collapsed}
      />
    );
  }

  return (
    <NavLinkItem
      key={`${item.label}-${item.href}`}
      item={item}
      pathname={pathname}
      rootHref={rootHref}
      collapsed={collapsed}
    />
  );
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

  const rootHref =
    navItems.find((item) => !item.footer && !item.children?.length)?.href ??
    "/";
  const mainItems = navItems.filter((item) => !item.footer);
  const footerItems = navItems.filter((item) => item.footer);
  const showHeader = headerLeft != null || headerRight != null;

  return (
    <div className="h-dvh overflow-hidden bg-canvas p-3 sm:p-4">
      <div className="mx-auto flex h-full max-w-[1600px] gap-3 sm:gap-4">
        <aside
          className={cn(
            ui.sidebar,
            "hidden h-full min-h-0 shrink-0 transition-[width] duration-200 lg:flex",
            collapsed ? "w-20" : "w-72",
          )}
        >
          <div className={cn("shrink-0 border-b border-border p-4", collapsed && "px-3")}>
            <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
              {collapsed ? (
                <DizleeLogo variant="mark" className="h-10 w-10 rounded-2xl" />
              ) : (
                <div className="min-w-0 space-y-1">
                  <DizleeLogo variant="full" />
                  {subtitle ? (
                    <p className="truncate text-xs text-foreground-subtle">
                      {subtitle}
                    </p>
                  ) : null}
                  {brand ? (
                    <p className="truncate text-xs font-medium text-foreground-muted">
                      {brand}
                    </p>
                  ) : null}
                </div>
              )}
            </div>
            {userLabel && !collapsed ? (
              <p className="mt-3 truncate text-xs text-foreground-muted">{userLabel}</p>
            ) : null}
          </div>

          <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-3">
            {mainItems.map((item) =>
              renderNavItem(item, pathname, rootHref, collapsed),
            )}
          </nav>

          <div className="shrink-0 space-y-2 border-t border-border p-3">
            {footerItems.map((item) =>
              renderNavItem(item, pathname, rootHref, collapsed),
            )}
            {footerSlot ? (
              <div
                className={cn(
                  "flex min-w-0 items-center",
                  collapsed && "justify-center",
                )}
              >
                {typeof footerSlot === "function"
                  ? footerSlot(collapsed)
                  : footerSlot}
              </div>
            ) : null}
            <button
              type="button"
              onClick={() => store.setCollapsed(!collapsed)}
              className={cn(ui.navItem, collapsed && "justify-center px-2")}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? <IconChevronRight /> : <IconChevronLeft />}
            </button>
          </div>
        </aside>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 sm:gap-4">
          {showHeader ? (
            <header
              className={cn(
                ui.header,
                "relative z-40 flex shrink-0 items-center gap-4 px-4 py-3 sm:px-5",
              )}
            >
              {headerLeft ? (
                <div className="min-w-0 flex-1">{headerLeft}</div>
              ) : null}
              {headerRight ? (
                <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
                  {headerRight}
                </div>
              ) : null}
            </header>
          ) : null}
          <main className="min-h-0 flex-1 overflow-auto rounded-[28px] border border-border bg-white/50 p-4 shadow-[var(--shadow-sm)] backdrop-blur-sm sm:p-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

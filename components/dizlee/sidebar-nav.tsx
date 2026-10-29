"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  DIZLEE_NAV_ITEMS,
  isDizleeNavActive,
  type DizleeNavItem,
} from "@/lib/dizlee/navigation";

function NavLinks({ items }: { items: DizleeNavItem[] }) {
  const pathname = usePathname();

  return (
    <>
      {items.map((item) => {
        if (item.children?.length) {
          return (
            <div key={`${item.label}-${item.href}`} className="space-y-1">
              <p className="px-3 pt-2 text-xs font-medium uppercase tracking-wide text-foreground-subtle">
                {item.label}
              </p>
              <NavLinks items={item.children} />
            </div>
          );
        }

        const active = isDizleeNavActive(pathname, item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`block rounded-md px-3 py-2 text-sm transition-colors ${
              active
                ? "bg-primary-muted font-medium text-primary"
                : "text-foreground-muted hover:bg-surface-muted hover:text-foreground"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </>
  );
}

export function DizleeSidebarNav() {
  return (
    <nav className="space-y-1">
      <NavLinks items={DIZLEE_NAV_ITEMS} />
    </nav>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  DIZLEE_NAV_ITEMS,
  isDizleeNavActive,
} from "@/lib/dizlee/navigation";

export function DizleeSidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="space-y-1">
      {DIZLEE_NAV_ITEMS.map((item) => {
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
    </nav>
  );
}

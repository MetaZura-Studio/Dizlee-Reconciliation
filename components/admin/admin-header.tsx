"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { SignOutButton } from "@/components/auth/sign-out-button";
import type { AdminSessionUser } from "@/lib/admin/auth";

type AdminHeaderProps = {
  user: AdminSessionUser;
};

export function AdminHeader({ user }: AdminHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const displayName = user.name?.trim() || "Admin";

  return (
    <header className="flex h-14 items-center justify-between border-b border-zinc-200 bg-white px-4 lg:px-6">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-zinc-900 text-xs font-semibold text-white">
          D
        </div>
        <span className="text-sm font-semibold">Dizlee</span>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled
          title="Search is not available yet"
          className="rounded-md border border-zinc-200 px-3 py-1.5 text-sm text-zinc-400"
        >
          Search
        </button>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className="flex items-center gap-2 rounded-md border border-zinc-200 px-3 py-1.5 text-sm hover:bg-zinc-50"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
          >
            <span className="hidden max-w-[10rem] truncate sm:inline">
              {displayName}
            </span>
            <span className="inline sm:hidden">Menu</span>
          </button>

          {menuOpen ? (
            <div
              role="menu"
              className="absolute right-0 z-20 mt-2 w-56 rounded-md border border-zinc-200 bg-white py-1 shadow-lg"
            >
              <div className="border-b border-zinc-100 px-4 py-3">
                <p className="truncate text-sm font-medium">{displayName}</p>
                <p className="truncate text-xs text-zinc-500">{user.email}</p>
              </div>
              <Link
                href="/change-password"
                role="menuitem"
                className="block px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
                onClick={() => setMenuOpen(false)}
              >
                Change password
              </Link>
              <div className="px-4 py-2">
                <SignOutButton
                  callbackUrl="/admin/login"
                  label="Log out"
                  className="w-full rounded-md border border-zinc-200 px-3 py-1.5 text-left text-sm text-zinc-700 hover:bg-zinc-50"
                />
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { DizleeSidebarNav } from "@/components/dizlee/sidebar-nav";
import { NotificationsBell } from "@/components/dizlee/notifications-bell";
import { requireDizleeSession } from "@/lib/dizlee/auth";

export default async function DizleeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireDizleeSession();
  if (!user) {
    redirect("/login?callbackUrl=/dizlee");
  }

  return (
    <div className="flex min-h-screen bg-white">
      <aside className="flex w-60 shrink-0 flex-col border-r border-zinc-200 bg-zinc-50 p-4">
        <p className="text-sm font-semibold text-zinc-900">Dizlee Portal</p>
        <p className="mt-1 text-xs text-zinc-500">Reconciliation Platform</p>
        <p className="mt-4 truncate text-xs text-zinc-600">{user.email}</p>
        <div className="mt-6 flex-1">
          <DizleeSidebarNav />
        </div>
        <div className="mt-6 border-t border-zinc-200 pt-4">
          <SignOutButton />
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-zinc-200 px-8 py-3">
          <Link
            href="/"
            className="text-sm text-zinc-500 transition-colors hover:text-zinc-800"
          >
            Back to home
          </Link>
          <NotificationsBell />
        </header>
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}

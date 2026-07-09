import Link from "next/link";
import { redirect } from "next/navigation";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { DizleeSidebarNav } from "@/components/dizlee/sidebar-nav";
import { NotificationsBell } from "@/components/dizlee/notifications-bell";
import { requireDizleeSession } from "@/lib/dizlee/auth";
import { getUnreadInboxCount } from "@/lib/dizlee/notifications/inbox";

export default async function DizleeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireDizleeSession();
  if (!user) {
    redirect("/login?callbackUrl=/dizlee");
  }

  const unreadCount = await getUnreadInboxCount(user.id);

  return (
    <div className="flex min-h-screen bg-canvas">
      <aside className="flex w-60 shrink-0 flex-col border-r border-border bg-surface-muted p-4">
        <p className="text-sm font-semibold text-foreground">Dizlee Portal</p>
        <p className="mt-1 text-xs text-foreground-subtle">Reconciliation Platform</p>
        <p className="mt-4 truncate text-xs text-foreground-muted">{user.email}</p>
        <div className="mt-6 flex-1">
          <DizleeSidebarNav />
        </div>
        <div className="mt-6 border-t border-border pt-4">
          <SignOutButton />
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border bg-surface px-8 py-3">
          <Link
            href="/"
            className="text-sm text-foreground-subtle transition-colors hover:text-foreground"
          >
            Back to home
          </Link>
          <NotificationsBell initialUnreadCount={unreadCount} />
        </header>
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}

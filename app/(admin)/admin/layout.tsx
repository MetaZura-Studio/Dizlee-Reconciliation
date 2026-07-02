import Link from "next/link";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { getAppSessionUser } from "@/lib/auth/session";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAppSessionUser();

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 border-r border-zinc-200 bg-zinc-50 p-4">
        <p className="text-sm font-semibold">Admin Portal</p>
        <p className="mt-1 text-xs text-zinc-500">Owned by Hussnain</p>
        {user ? (
          <p className="mt-3 text-xs text-zinc-600">{user.email}</p>
        ) : null}
        <nav className="mt-6 space-y-2 text-sm text-zinc-600">
          <p>Dashboard (coming soon)</p>
          <p>Users (coming soon)</p>
          <p>Audit Logs (coming soon)</p>
        </nav>
        <div className="mt-8">
          <SignOutButton />
        </div>
      </aside>
      <main className="flex-1 p-8">
        <div className="mb-4">
          <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-800">
            Back to home
          </Link>
        </div>
        {children}
      </main>
    </div>
  );
}

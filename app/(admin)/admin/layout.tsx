export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <aside className="w-56 border-r border-zinc-200 bg-zinc-50 p-4">
        <p className="text-sm font-semibold">Admin Portal</p>
        <p className="mt-1 text-xs text-zinc-500">Owned by Hussnain</p>
        <nav className="mt-6 space-y-2 text-sm text-zinc-600">
          <p>Dashboard (coming soon)</p>
          <p>Users (coming soon)</p>
          <p>Audit Logs (coming soon)</p>
        </nav>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}

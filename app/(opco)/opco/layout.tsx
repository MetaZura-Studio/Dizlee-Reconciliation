import { NotificationsBell } from "@/components/opco/NotificationsBell";
import { Sidebar } from "@/components/opco/Sidebar";
import { requireOpcoSession } from "@/lib/opco/auth";
import { getOpcoUnreadInboxCount } from "@/lib/opco/queries/notifications";

export default async function OpcoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireOpcoSession();
  const unreadCount = await getOpcoUnreadInboxCount(
    BigInt(session.userId),
    BigInt(session.opcoId),
  );

  return (
    <div className="flex min-h-screen bg-canvas">
      <Sidebar email={session.email} />
      <div className="flex flex-1 flex-col">
        <header className="flex justify-end border-b border-border bg-surface px-8 py-3">
          <NotificationsBell initialUnreadCount={unreadCount} />
        </header>
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}

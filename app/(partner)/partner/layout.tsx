import { NotificationsBell } from "@/components/partner/NotificationsBell";
import { Sidebar } from "@/components/partner/Sidebar";
import { requirePartnerSession } from "@/lib/partner/auth";
import { getPartnerUnreadInboxCount } from "@/lib/partner/queries/notifications";

export default async function PartnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requirePartnerSession();
  const unreadCount = await getPartnerUnreadInboxCount(
    BigInt(session.userId),
    BigInt(session.partnerId),
  );

  return (
    <div className="flex min-h-screen">
      <Sidebar email={session.email} />
      <div className="flex flex-1 flex-col">
        <header className="flex justify-end border-b border-zinc-200 px-8 py-3">
          <NotificationsBell initialUnreadCount={unreadCount} />
        </header>
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}

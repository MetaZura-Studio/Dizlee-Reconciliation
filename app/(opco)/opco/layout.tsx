import { OpcoWorkspace } from "@/components/opco/opco-workspace";
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
    <OpcoWorkspace
      name={session.name}
      email={session.email}
      unreadCount={unreadCount}
    >
      {children}
    </OpcoWorkspace>
  );
}

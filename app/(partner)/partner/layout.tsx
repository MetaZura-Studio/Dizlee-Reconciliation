import { PartnerWorkspace } from "@/components/partner/partner-workspace";
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
    <PartnerWorkspace email={session.email} unreadCount={unreadCount}>
      {children}
    </PartnerWorkspace>
  );
}

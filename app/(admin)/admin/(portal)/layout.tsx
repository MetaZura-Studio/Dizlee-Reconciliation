import { AdminWorkspace } from "@/components/admin/admin-workspace";
import { requireAdminUser } from "@/lib/admin/auth";
import { getAdminUnreadInboxCount } from "@/lib/admin/notifications";
import { countPendingPartnerLinkRequests } from "@/lib/admin/opco-partner-link-requests";

export default async function AdminPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAdminUser();
  const [unreadCount, pendingPartnerLinkRequests] = await Promise.all([
    getAdminUnreadInboxCount(BigInt(user.id)),
    countPendingPartnerLinkRequests(),
  ]);

  return (
    <AdminWorkspace
      user={user}
      unreadCount={unreadCount}
      pendingPartnerLinkRequests={pendingPartnerLinkRequests}
    >
      {children}
    </AdminWorkspace>
  );
}

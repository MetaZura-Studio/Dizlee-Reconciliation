import { AdminWorkspace } from "@/components/admin/admin-workspace";
import { requireAdminUser } from "@/lib/admin/auth";
import { getAdminUnreadInboxCount } from "@/lib/admin/notifications";

export default async function AdminPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAdminUser();
  const unreadCount = await getAdminUnreadInboxCount(BigInt(user.id));

  return (
    <AdminWorkspace user={user} unreadCount={unreadCount}>
      {children}
    </AdminWorkspace>
  );
}

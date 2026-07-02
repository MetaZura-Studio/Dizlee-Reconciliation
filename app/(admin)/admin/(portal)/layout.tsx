import { AdminWorkspace } from "@/components/admin/admin-workspace";
import { requireAdminUser } from "@/lib/admin/auth";

export default async function AdminPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAdminUser();

  return <AdminWorkspace user={user}>{children}</AdminWorkspace>;
}

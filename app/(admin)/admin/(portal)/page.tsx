import { DashboardView } from "@/components/admin/dashboard-view";
import { getAdminDashboardData } from "@/lib/admin/dashboard";

export default async function AdminDashboardPage() {
  const data = await getAdminDashboardData();

  return <DashboardView data={data} />;
}

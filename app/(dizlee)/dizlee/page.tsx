import { DashboardView } from "@/components/dizlee/dashboard-view";
import { currentPeriod, getDashboardData } from "@/lib/dizlee/dashboard";

export default async function DizleeDashboardPage() {
  const data = await getDashboardData(currentPeriod());

  return <DashboardView initialData={data} />;
}

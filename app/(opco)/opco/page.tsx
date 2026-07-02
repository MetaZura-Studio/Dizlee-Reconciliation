import { DashboardSummary } from "@/components/opco/DashboardSummary";
import { requireOpcoSession } from "@/lib/opco/auth";
import { parseDashboardPeriod } from "@/lib/opco/period";
import { getOpcoDashboard } from "@/lib/opco/queries/dashboard";

type OpcoDashboardPageProps = {
  searchParams: Promise<{
    year?: string;
    month?: string;
  }>;
};

export default async function OpcoDashboardPage({
  searchParams,
}: OpcoDashboardPageProps) {
  const session = await requireOpcoSession();
  const params = await searchParams;
  const { year, month } = parseDashboardPeriod(params.year, params.month);
  const data = await getOpcoDashboard(BigInt(session.opcoId), year, month);

  return <DashboardSummary data={data} />;
}

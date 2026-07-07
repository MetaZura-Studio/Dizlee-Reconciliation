import { DashboardSummary } from "@/components/partner/DashboardSummary";
import { requirePartnerSession } from "@/lib/partner/auth";
import { parseDashboardPeriod } from "@/lib/partner/period";
import { getPartnerDashboard } from "@/lib/partner/queries/dashboard";

type PartnerDashboardPageProps = {
  searchParams: Promise<{
    year?: string;
    month?: string;
  }>;
};

export default async function PartnerDashboardPage({
  searchParams,
}: PartnerDashboardPageProps) {
  const session = await requirePartnerSession();
  const params = await searchParams;
  const { year, month } = parseDashboardPeriod(params.year, params.month);
  const data = await getPartnerDashboard(
    BigInt(session.partnerId),
    year,
    month,
  );

  return <DashboardSummary data={data} />;
}

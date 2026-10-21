import { PartnerPortalRevenueShareView } from "@/components/partner/partner-revenue-share-view";
import { currentPeriod } from "@/lib/dizlee/dashboard";
import {
  listPartnerRevenueShareReports,
  parsePartnerRsListFilters,
} from "@/lib/dizlee/partner-revenue-share";
import { requirePartnerSession } from "@/lib/partner/auth";

type PartnerRevenueSharePageProps = {
  searchParams: Promise<{
    month?: string;
    year?: string;
  }>;
};

export default async function PartnerRevenueSharePage({
  searchParams,
}: PartnerRevenueSharePageProps) {
  const session = await requirePartnerSession();
  const params = await searchParams;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) {
      query.set(key, value);
    }
  }

  const filters = parsePartnerRsListFilters(query);
  const fallback = currentPeriod();
  const month = filters.month ?? fallback.month;
  const year = filters.year ?? fallback.year;
  const initial = await listPartnerRevenueShareReports({
    month,
    year,
    partnerId: session.partnerId,
  });

  return (
    <PartnerPortalRevenueShareView
      initialMonth={month}
      initialYear={year}
      initialItems={initial.items}
    />
  );
}

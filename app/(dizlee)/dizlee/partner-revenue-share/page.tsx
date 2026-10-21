import { PartnerRevenueShareView } from "@/components/dizlee/partner-revenue-share-view";
import { currentPeriod } from "@/lib/dizlee/dashboard";
import {
  listPartnerRevenueShareReports,
  parsePartnerRsListFilters,
} from "@/lib/dizlee/partner-revenue-share";

type DizleePartnerRevenueSharePageProps = {
  searchParams: Promise<{
    month?: string;
    year?: string;
  }>;
};

export default async function DizleePartnerRevenueSharePage({
  searchParams,
}: DizleePartnerRevenueSharePageProps) {
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
  const initial = await listPartnerRevenueShareReports({ month, year });

  return (
    <PartnerRevenueShareView
      initialMonth={month}
      initialYear={year}
      initialItems={initial.items}
    />
  );
}

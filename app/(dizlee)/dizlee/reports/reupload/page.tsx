import { ReuploadRequestsView } from "@/components/dizlee/reupload-requests-view";
import {
  getReportFilterOptions,
  listReuploadRequests,
  parseReuploadListFilters,
} from "@/lib/dizlee/reupload-requests";

type DizleeReuploadPageProps = {
  searchParams: Promise<{
    month?: string;
    year?: string;
    opcoId?: string;
    partnerId?: string;
    page?: string;
  }>;
};

export default async function DizleeReuploadRequestsPage({
  searchParams,
}: DizleeReuploadPageProps) {
  const params = await searchParams;
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value) {
      query.set(key, value);
    }
  }

  const filters = parseReuploadListFilters(query);
  const [initialResult, filterOptions] = await Promise.all([
    listReuploadRequests(filters),
    getReportFilterOptions(),
  ]);

  return (
    <ReuploadRequestsView
      initialResult={initialResult}
      initialFilterOptions={filterOptions}
    />
  );
}

import { PartnerInvoiceAccessView } from "@/components/dizlee/partner-invoice-access-view";
import {
  listPartnerInvoiceAccess,
  parsePartnerInvoiceAccessFilters,
} from "@/lib/dizlee/partner-invoice-access";

type PageProps = {
  searchParams: Promise<{
    search?: string;
    status?: string;
    sortBy?: string;
    sortDir?: string;
    page?: string;
  }>;
};

export default async function DizleePartnerInvoiceAccessPage({
  searchParams,
}: PageProps) {
  const params = await searchParams;
  const query = new URLSearchParams();
  if (params.search) {
    query.set("search", params.search);
  }
  if (params.status) {
    query.set("status", params.status);
  }
  if (params.sortBy) {
    query.set("sortBy", params.sortBy);
  }
  if (params.sortDir) {
    query.set("sortDir", params.sortDir);
  }
  if (params.page) {
    query.set("page", params.page);
  }

  const initialResult = await listPartnerInvoiceAccess(
    parsePartnerInvoiceAccessFilters(query),
  );

  return <PartnerInvoiceAccessView initialResult={initialResult} />;
}

import { Suspense } from "react";

import { OpcoPartnersView } from "@/components/admin/opco-partners-view";
import { countPendingPartnerLinkRequests } from "@/lib/admin/opco-partner-link-requests";
import {
  getOpcoPartnerLinksPageData,
  OpcoPartnerLinksError,
  type OpcoPartnerLinksPageData,
} from "@/lib/admin/opco-partner-links";

type AdminOpcoPartnersPageProps = {
  searchParams: Promise<{ opcoId?: string; tab?: string }>;
};

export default async function AdminOpcoPartnersPage({
  searchParams,
}: AdminOpcoPartnersPageProps) {
  const params = await searchParams;
  const initialTab = params.tab === "requests" ? "requests" : "links";
  let pageData: OpcoPartnerLinksPageData | null = null;
  let pendingRequestCount = 0;
  let errorMessage: string | null = null;

  try {
    const [data, pendingCount] = await Promise.all([
      getOpcoPartnerLinksPageData(params.opcoId),
      countPendingPartnerLinkRequests(),
    ]);
    pageData = data;
    pendingRequestCount = pendingCount;
  } catch (error) {
    errorMessage =
      error instanceof OpcoPartnerLinksError
        ? error.message
        : "Failed to load OpCo partner links.";
  }

  if (errorMessage) {
    return (
      <div className="w-full space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight">OpCo partners</h1>
        <p className="rounded-md border border-danger-border bg-danger-muted px-3 py-2 text-sm text-danger">
          {errorMessage}
        </p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">OpCo partners</h1>
        <p className="text-sm text-foreground-muted">
          Configure which Partners each OpCo can work with, and review link
          requests.
        </p>
      </div>

      <Suspense fallback={null}>
        <OpcoPartnersView
          initialData={pageData!}
          initialTab={initialTab}
          initialPendingRequestCount={pendingRequestCount}
        />
      </Suspense>
    </div>
  );
}

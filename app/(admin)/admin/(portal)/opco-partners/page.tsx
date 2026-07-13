import { OpcoPartnersView } from "@/components/admin/opco-partners-view";
import {
  getOpcoPartnerLinksPageData,
  OpcoPartnerLinksError,
  type OpcoPartnerLinksPageData,
} from "@/lib/admin/opco-partner-links";

type AdminOpcoPartnersPageProps = {
  searchParams: Promise<{ opcoId?: string }>;
};

export default async function AdminOpcoPartnersPage({
  searchParams,
}: AdminOpcoPartnersPageProps) {
  const params = await searchParams;
  let pageData: OpcoPartnerLinksPageData | null = null;
  let errorMessage: string | null = null;

  try {
    pageData = await getOpcoPartnerLinksPageData(params.opcoId);
  } catch (error) {
    errorMessage =
      error instanceof OpcoPartnerLinksError
        ? error.message
        : "Failed to load OpCo partner links.";
  }

  if (errorMessage) {
    return (
      <div className="mx-auto max-w-3xl space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight">OpCo partners</h1>
        <p className="rounded-md border border-danger-border bg-danger-muted px-3 py-2 text-sm text-danger">
          {errorMessage}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">OpCo partners</h1>
        <p className="text-sm text-foreground-muted">
          Configure which Partners each OpCo can work with.
        </p>
      </div>

      <OpcoPartnersView initialData={pageData!} />
    </div>
  );
}

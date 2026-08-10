import { PartnersView } from "@/components/admin/partners-view";
import { listPartners, PartnerActionError } from "@/lib/admin/partners";

export default async function AdminPartnersPage() {
  let loadError: string | null = null;
  let partners: Awaited<ReturnType<typeof listPartners>> = [];

  try {
    partners = await listPartners();
  } catch (error) {
    loadError =
      error instanceof PartnerActionError
        ? error.message
        : "Partners could not be loaded.";
  }

  if (loadError) {
    return (
      <div className="w-full space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight">Partners</h1>
        <p className="rounded-md border border-danger-border bg-danger-muted px-3 py-2 text-sm text-danger">
          {loadError}
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <PartnersView initialPartners={partners} />
    </div>
  );
}

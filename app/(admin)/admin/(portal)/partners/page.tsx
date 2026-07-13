import { PartnersView } from "@/components/admin/partners-view";
import { listPartners, PartnerActionError } from "@/lib/admin/partners";

export default async function AdminPartnersPage() {
  try {
    const partners = await listPartners();

    return (
      <div className="mx-auto max-w-5xl">
        <PartnersView initialPartners={partners} />
      </div>
    );
  } catch (error) {
    const message =
      error instanceof PartnerActionError
        ? error.message
        : "Partners could not be loaded.";

    return (
      <div className="mx-auto max-w-5xl space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight">Partners</h1>
        <p className="rounded-md border border-danger-border bg-danger-muted px-3 py-2 text-sm text-danger">
          {message}
        </p>
      </div>
    );
  }
}

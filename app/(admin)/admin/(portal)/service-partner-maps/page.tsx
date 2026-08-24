import { ServicePartnerMapsView } from "@/components/admin/service-partner-maps-view";
import { listOpcos, OpcoActionError } from "@/lib/admin/opcos";
import { listPartners, PartnerActionError } from "@/lib/admin/partners";
import {
  listServicePartnerMaps,
  ServicePartnerMapActionError,
} from "@/lib/admin/service-partner-maps";

export default async function AdminServicePartnerMapsPage() {
  let loadError: string | null = null;
  let maps: Awaited<ReturnType<typeof listServicePartnerMaps>> = [];
  let partners: Awaited<ReturnType<typeof listPartners>> = [];
  let opcos: Awaited<ReturnType<typeof listOpcos>> = [];

  try {
    [maps, partners, opcos] = await Promise.all([
      listServicePartnerMaps(),
      listPartners(),
      listOpcos(),
    ]);
  } catch (error) {
    loadError =
      error instanceof ServicePartnerMapActionError ||
      error instanceof PartnerActionError ||
      error instanceof OpcoActionError
        ? error.message
        : "Service–Partner maps could not be loaded.";
  }

  if (loadError) {
    return (
      <div className="w-full space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight">
          Service–Partner maps
        </h1>
        <p className="rounded-md border border-danger-border bg-danger-muted px-3 py-2 text-sm text-danger">
          {loadError}
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <ServicePartnerMapsView initialMaps={maps} partners={partners} opcos={opcos} />
    </div>
  );
}

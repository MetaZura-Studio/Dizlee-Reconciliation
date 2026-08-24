/**
 * Bootstrap Service–Partner map rows for OpCos without a Partner column
 * (Iraq + Sudan). Keys are unique per OpCo + service.
 */

import { OPCO_PARTNER_LINK_SEEDS } from "./opco-partner-links";
import { PARTNER_SEEDS } from "./partners";

const MAP_OPCO_SLUGS = new Set(["zain-iraq", "zain-sudan"]);

export type ServicePartnerMapSeed = {
  opcoSlug: string;
  serviceName: string;
  partnerSlug: string;
};

const partnerNameBySlug = new Map(
  PARTNER_SEEDS.map((partner) => [partner.slug, partner.name]),
);

const rows = new Map<string, ServicePartnerMapSeed>();

for (const link of OPCO_PARTNER_LINK_SEEDS) {
  if (!MAP_OPCO_SLUGS.has(link.opcoSlug)) {
    continue;
  }
  const name = partnerNameBySlug.get(link.partnerSlug);
  if (!name) {
    continue;
  }
  const key = `${link.opcoSlug}::${link.partnerSlug}`;
  if (!rows.has(key)) {
    rows.set(key, {
      opcoSlug: link.opcoSlug,
      serviceName: name,
      partnerSlug: link.partnerSlug,
    });
  }
}

export const SERVICE_PARTNER_MAP_SEEDS: ServicePartnerMapSeed[] = [
  ...rows.values(),
];

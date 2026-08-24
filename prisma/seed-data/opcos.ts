/**
 * Demo OpCo tenants (Zain operating companies) with fixed ids, slugs, and default settlement currencies.
 */

import type { SeedOpco } from "./helpers";

export const OPCO_SEEDS: SeedOpco[] = [
  {
    id: 1,
    slug: "zain-kuwait",
    name: "Zain Kuwait",
    defaultCurrencyIso: "KWD",
  },
  {
    id: 2,
    slug: "zain-ksa",
    name: "Zain KSA",
    defaultCurrencyIso: "SAR",
    vatPercent: 19.5,
  },
  {
    id: 3,
    slug: "zain-iraq",
    name: "Zain Iraq",
    defaultCurrencyIso: "IQD",
  },
  {
    id: 4,
    slug: "zain-jordan",
    name: "Zain Jordan",
    defaultCurrencyIso: "JOD",
  },
  {
    id: 5,
    slug: "zain-bahrain",
    name: "Zain Bahrain",
    defaultCurrencyIso: "BHD",
  },
  {
    id: 6,
    slug: "zain-sudan",
    name: "Zain Sudan",
    defaultCurrencyIso: "SDG",
  },
  {
    id: 7,
    slug: "zain-south-sudan",
    name: "Zain South Sudan",
    defaultCurrencyIso: "SSP",
  },
];

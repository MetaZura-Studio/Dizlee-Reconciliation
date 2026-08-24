import { describe, expect, it } from "vitest";

import {
  assertUniqueSlugs,
  dedupeLinks,
  validateSeedLinks,
} from "@/prisma/seed-data/helpers";
import { OPCO_PARTNER_LINK_SEEDS } from "@/prisma/seed-data/opco-partner-links";
import { OPCO_SEEDS } from "@/prisma/seed-data/opcos";
import { PARTNER_SEEDS } from "@/prisma/seed-data/partners";
import { SERVICE_PARTNER_MAP_SEEDS } from "@/prisma/seed-data/service-partner-maps";

describe("seed data validation", () => {
  it("has unique OpCo and Partner slugs", () => {
    expect(() => assertUniqueSlugs("OpCo", OPCO_SEEDS)).not.toThrow();
    expect(() => assertUniqueSlugs("Partner", PARTNER_SEEDS)).not.toThrow();
  });

  it("has valid OpCo–Partner link references", () => {
    expect(() =>
      validateSeedLinks(OPCO_SEEDS, PARTNER_SEEDS, OPCO_PARTNER_LINK_SEEDS),
    ).not.toThrow();
  });

  it("dedupes links without changing count", () => {
    const deduped = dedupeLinks(OPCO_PARTNER_LINK_SEEDS);
    expect(deduped).toHaveLength(OPCO_PARTNER_LINK_SEEDS.length);
    expect(deduped.length).toBeGreaterThan(0);
  });

  it("seeds expected entity counts", () => {
    expect(OPCO_SEEDS).toHaveLength(7);
    expect(PARTNER_SEEDS).toHaveLength(73);
    expect(SERVICE_PARTNER_MAP_SEEDS.length).toBeGreaterThan(0);
  });

  it("seeds Service–Partner maps for Iraq and Sudan linked partners", () => {
    const slugs = SERVICE_PARTNER_MAP_SEEDS.map((row) => row.partnerSlug);
    expect(slugs).toContain("digitalvirgo");
    expect(slugs).toContain("arpuplus");
    expect(slugs).toContain("gamemine");
    expect(
      SERVICE_PARTNER_MAP_SEEDS.every(
        (row) => row.opcoSlug === "zain-iraq" || row.opcoSlug === "zain-sudan",
      ),
    ).toBe(true);
  });
});

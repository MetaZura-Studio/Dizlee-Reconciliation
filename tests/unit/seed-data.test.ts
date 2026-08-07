import { describe, expect, it } from "vitest";

import {
  assertUniqueSlugs,
  dedupeLinks,
  validateSeedLinks,
} from "@/prisma/seed-data/helpers";
import { OPCO_PARTNER_LINK_SEEDS } from "@/prisma/seed-data/opco-partner-links";
import { OPCO_SEEDS } from "@/prisma/seed-data/opcos";
import { PARTNER_SEEDS } from "@/prisma/seed-data/partners";

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
    expect(deduped).toHaveLength(109);
  });

  it("seeds expected entity counts", () => {
    expect(OPCO_SEEDS).toHaveLength(7);
    expect(PARTNER_SEEDS).toHaveLength(51);
  });
});

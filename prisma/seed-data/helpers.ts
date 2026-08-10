/**
 * Shared seed types and integrity helpers for OpCo, partner, and link datasets.
 * Derives portal login emails from slugs and validates referential consistency before `seed.ts` runs.
 */

export type SeedEntity = {
  slug: string;
  name: string;
};

export type SeedOpco = SeedEntity & {
  id: number;
  defaultCurrencyIso: string;
  vatPercent?: number;
};

export type SeedLink = {
  opcoSlug: string;
  partnerSlug: string;
};

export function portalEmail(slug: string): string {
  return `${slug}@dizlee.com`;
}

export function validateSeedLinks(
  opcos: SeedOpco[],
  partners: SeedEntity[],
  links: SeedLink[],
): void {
  const opcoSlugs = new Set(opcos.map((item) => item.slug));
  const partnerSlugs = new Set(partners.map((item) => item.slug));

  for (const link of links) {
    if (!opcoSlugs.has(link.opcoSlug)) {
      throw new Error(`Unknown opcoSlug in links: ${link.opcoSlug}`);
    }
    if (!partnerSlugs.has(link.partnerSlug)) {
      throw new Error(`Unknown partnerSlug in links: ${link.partnerSlug}`);
    }
  }
}

export function assertUniqueSlugs(label: string, items: SeedEntity[]): void {
  const seen = new Set<string>();
  for (const item of items) {
    if (seen.has(item.slug)) {
      throw new Error(`Duplicate ${label} slug: ${item.slug}`);
    }
    seen.add(item.slug);
  }
}

export function dedupeLinks(links: SeedLink[]): SeedLink[] {
  const seen = new Set<string>();
  const result: SeedLink[] = [];

  for (const link of links) {
    const key = `${link.opcoSlug}:${link.partnerSlug}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(link);
  }

  return result;
}

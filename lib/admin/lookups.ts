/**
 * Lookup table resolver by type code + value code.
 * Shared by Admin audit writers and Dizlee/platform jobs that need stable lookup IDs.
 * Throws if the pair is missing from seed data.
 */
import { prisma } from "@/lib/prisma";

/** Resolve a seeded lookup row id; fails fast when code is unknown. */
export async function getLookupId(
  typeCode: string,
  code: string,
): Promise<number> {
  const lookup = await prisma.lookup.findFirst({
    where: {
      code,
      lookupType: { code: typeCode },
    },
    select: { id: true },
  });

  if (!lookup) {
    throw new Error(`Lookup not found: ${typeCode}.${code}`);
  }

  return lookup.id;
}

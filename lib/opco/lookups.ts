/**
 * OpCo-side lookup ID resolution against seeded `lookup` rows.
 *
 * Portal: OpCo. Throws when `typeCode.code` is missing — callers treat that as
 * configuration drift, not user error. Prefer platform lookups for cross-portal code.
 */

import prisma from "@/lib/prisma";

/** Resolves a lookup primary key by type and code (e.g. `REPORT_STATUS` / `SUBMITTED`). */
export async function getOpcoLookupId(
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

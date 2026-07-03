import { prisma } from "@/lib/prisma";

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

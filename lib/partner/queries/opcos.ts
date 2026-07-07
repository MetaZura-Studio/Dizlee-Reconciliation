import prisma from "@/lib/prisma";

export type LinkedOpco = {
  id: string;
  name: string;
};

type OpcoLinkRow = {
  opcoId: bigint;
  opco: {
    id: bigint;
    name: string;
  };
};

export function mapLinkedOpcos(links: OpcoLinkRow[]): LinkedOpco[] {
  return links.map((link) => ({
    id: link.opco.id.toString(),
    name: link.opco.name,
  }));
}

export async function getLinkedOpcosForPartner(
  partnerId: bigint,
): Promise<LinkedOpco[]> {
  const links = await prisma.opcoPartnerLink.findMany({
    where: { partnerId },
    include: {
      opco: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: {
      opco: {
        name: "asc",
      },
    },
  });

  return mapLinkedOpcos(links);
}

export async function isOpcoLinkedToPartner(
  partnerId: bigint,
  opcoId: bigint,
): Promise<boolean> {
  const link = await prisma.opcoPartnerLink.findFirst({
    where: {
      partnerId,
      opcoId,
    },
    select: {
      partnerId: true,
    },
  });

  return link !== null;
}

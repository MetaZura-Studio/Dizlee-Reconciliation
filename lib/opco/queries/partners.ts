import prisma from "@/lib/prisma";

export type LinkedPartner = {
  id: string;
  name: string;
};

type PartnerLinkRow = {
  partnerId: bigint;
  partner: {
    id: bigint;
    name: string;
  };
};

export function mapLinkedPartners(links: PartnerLinkRow[]): LinkedPartner[] {
  return links.map((link) => ({
    id: link.partner.id.toString(),
    name: link.partner.name,
  }));
}

export async function getLinkedPartnersForOpco(
  opcoId: bigint,
): Promise<LinkedPartner[]> {
  const links = await prisma.opcoPartnerLink.findMany({
    where: { opcoId },
    include: {
      partner: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: {
      partner: {
        name: "asc",
      },
    },
  });

  return mapLinkedPartners(links);
}

export async function isPartnerLinkedToOpco(
  opcoId: bigint,
  partnerId: bigint,
): Promise<boolean> {
  const link = await prisma.opcoPartnerLink.findFirst({
    where: {
      opcoId,
      partnerId,
    },
    select: {
      opcoId: true,
    },
  });

  return link !== null;
}

/**
 * Active OpCo–Partner links for upload pickers and authorization checks.
 *
 * Portal: OpCo. Uses `ACTIVE_OPCO_PARTNER_LINK_FILTER`; inactive links are invisible
 * to upload and list filter options.
 */

import { ACTIVE_OPCO_PARTNER_LINK_FILTER } from "@/lib/platform/opco-partner-links";
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
    where: {
      opcoId,
      ...ACTIVE_OPCO_PARTNER_LINK_FILTER,
      partner: { isDeleted: false },
    },
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
      ...ACTIVE_OPCO_PARTNER_LINK_FILTER,
    },
    select: {
      opcoId: true,
    },
  });

  return link !== null;
}

import type { Prisma } from "@prisma/client";

import { writeSettingsAuditLog } from "@/lib/admin/audit";
import type {
  OpcoListItem,
  OpcoPartnerLinksPageData,
  OpcoPartnerLinksView,
  PartnerLinkItem,
} from "@/lib/admin/opco-partner-links.shared";
import {
  getOpcoPartnerLinksSchema,
  saveOpcoPartnerLinksSchema,
  type SaveOpcoPartnerLinksInput,
} from "@/lib/admin/validation/opco-partner-links";
import {
  computeLinkDiff,
  isLinkableOpcoName,
} from "@/lib/platform/opco-partner-links";
import { prisma } from "@/lib/prisma";

export type {
  OpcoListItem,
  OpcoPartnerLinksPageData,
  OpcoPartnerLinksView,
  PartnerLinkItem,
} from "@/lib/admin/opco-partner-links.shared";

export { computeLinkDiff } from "@/lib/platform/opco-partner-links";

export class OpcoPartnerLinksError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "OpcoPartnerLinksError";
    this.status = status;
  }
}

function mapOpco(row: { id: bigint; name: string }): OpcoListItem {
  return { id: row.id.toString(), name: row.name };
}

async function listActivePartners() {
  return prisma.partner.findMany({
    where: { isDeleted: false },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

async function listLinkableOpcos(): Promise<OpcoListItem[]> {
  const opcos = await prisma.opco.findMany({
    where: { isDeleted: false },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return opcos.filter((opco) => isLinkableOpcoName(opco.name)).map(mapOpco);
}

async function getLinkableOpco(opcoId: bigint) {
  const opco = await prisma.opco.findFirst({
    where: { id: opcoId, isDeleted: false },
    select: { id: true, name: true },
  });

  if (!opco || !isLinkableOpcoName(opco.name)) {
    return null;
  }

  return opco;
}

export async function listOpcosForLinkAdmin(): Promise<OpcoListItem[]> {
  return listLinkableOpcos();
}

export async function getPartnerLinksForOpco(
  opcoIdRaw: string,
): Promise<OpcoPartnerLinksView> {
  const parsed = getOpcoPartnerLinksSchema.safeParse({ opcoId: opcoIdRaw });
  if (!parsed.success) {
    throw new OpcoPartnerLinksError(
      parsed.error.issues[0]?.message ?? "Invalid OpCo",
    );
  }

  const opcoId = BigInt(parsed.data.opcoId);
  const opco = await getLinkableOpco(opcoId);
  if (!opco) {
    throw new OpcoPartnerLinksError("OpCo not found", 404);
  }

  const [partners, links] = await Promise.all([
    listActivePartners(),
    prisma.opcoPartnerLink.findMany({
      where: { opcoId },
      select: { partnerId: true, isDeleted: true },
    }),
  ]);

  const activeLinked = new Set(
    links
      .filter((link) => !link.isDeleted)
      .map((link) => link.partnerId.toString()),
  );

  const partnerItems: PartnerLinkItem[] = partners.map((partner) => ({
    id: partner.id.toString(),
    name: partner.name,
    linked: activeLinked.has(partner.id.toString()),
  }));

  const linkedCount = partnerItems.filter((partner) => partner.linked).length;

  return {
    opco: mapOpco(opco),
    partners: partnerItems,
    linkedCount,
    totalPartners: partnerItems.length,
  };
}

export async function getOpcoPartnerLinksPageData(
  opcoIdRaw?: string,
): Promise<OpcoPartnerLinksPageData> {
  const opcos = await listLinkableOpcos();

  if (opcos.length === 0) {
    return { opcos, links: null };
  }

  const selectedOpcoId = opcoIdRaw?.trim() || opcos[0]?.id;
  if (!selectedOpcoId) {
    return { opcos, links: null };
  }

  const links = await getPartnerLinksForOpco(selectedOpcoId);
  return { opcos, links };
}

export async function savePartnerLinksForOpco(
  rawInput: SaveOpcoPartnerLinksInput,
  actorUserId: bigint,
): Promise<OpcoPartnerLinksView> {
  const parsed = saveOpcoPartnerLinksSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new OpcoPartnerLinksError(
      parsed.error.issues[0]?.message ?? "Invalid input",
    );
  }

  const opcoId = BigInt(parsed.data.opcoId);
  const opco = await getLinkableOpco(opcoId);
  if (!opco) {
    throw new OpcoPartnerLinksError("OpCo not found", 404);
  }

  const partners = await listActivePartners();
  const partnerIdSet = new Set(partners.map((partner) => partner.id.toString()));

  for (const partnerId of parsed.data.partnerIds) {
    if (!partnerIdSet.has(partnerId)) {
      throw new OpcoPartnerLinksError("Invalid partner ID");
    }
  }

  const selectedPartnerIds = [...new Set(parsed.data.partnerIds)];
  const allPartnerIds = partners.map((partner) => partner.id.toString());

  const existingLinks = await prisma.opcoPartnerLink.findMany({
    where: { opcoId },
    select: { partnerId: true, isDeleted: true },
  });

  const currentlyLinkedIds = existingLinks
    .filter((link) => !link.isDeleted)
    .map((link) => link.partnerId.toString());

  const diff = computeLinkDiff({
    allPartnerIds,
    currentlyLinkedIds,
    selectedPartnerIds,
  });

  const now = new Date();
  const operations: Prisma.PrismaPromise<unknown>[] = [];

  for (const partnerIdStr of diff.toActivate) {
    const partnerId = BigInt(partnerIdStr);
    operations.push(
      prisma.opcoPartnerLink.upsert({
        where: {
          opcoId_partnerId: { opcoId, partnerId },
        },
        create: {
          opcoId,
          partnerId,
          createdByUserId: actorUserId,
          updatedByUserId: actorUserId,
          isDeleted: false,
        },
        update: {
          isDeleted: false,
          deletedAt: null,
          deletedByUserId: null,
          updatedByUserId: actorUserId,
        },
      }),
    );
  }

  for (const partnerIdStr of diff.toSoftDelete) {
    const partnerId = BigInt(partnerIdStr);
    operations.push(
      prisma.opcoPartnerLink.update({
        where: {
          opcoId_partnerId: { opcoId, partnerId },
        },
        data: {
          isDeleted: true,
          deletedAt: now,
          deletedByUserId: actorUserId,
          updatedByUserId: actorUserId,
        },
      }),
    );
  }

  if (operations.length > 0) {
    await prisma.$transaction(operations);
  }

  await writeSettingsAuditLog({
    actorUserId,
    action: "SETTINGS_OPCO_PARTNER_LINK_UPDATED",
    message: `Partner links saved for ${opco.name}.`,
    metadata: {
      opcoId: opco.id.toString(),
      partnerIds: selectedPartnerIds,
      added: diff.added,
      removed: diff.removed,
    },
  });

  return getPartnerLinksForOpco(opco.id.toString());
}

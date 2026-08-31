/**
 * Admin Accept/Reject workflow for OpCo partner-link requests.
 */

import { formatPeriodLabel } from "@/lib/opco/period";
import { DomainError } from "@/lib/errors/app-error";
import { writeSettingsAuditLog } from "@/lib/admin/audit";
import { notifyAdminUsers } from "@/lib/platform/notify-dizlee";
import { notifyOpcoUsers } from "@/lib/platform/notify-opco";
import { prisma } from "@/lib/prisma";

export type PartnerLinkRequestStatus = "PENDING" | "APPROVED" | "REJECTED";

export type AdminPartnerLinkRequestItem = {
  id: string;
  opcoId: string;
  opcoName: string;
  periodLabel: string;
  month: number;
  year: number;
  message: string;
  partnerNames: string[];
  status: PartnerLinkRequestStatus;
  createdAt: string;
  decidedAt: string | null;
};

export type AcceptPartnerLinkRequestResult = {
  request: AdminPartnerLinkRequestItem;
  linkedPartnerNames: string[];
  missingPartnerNames: string[];
  approved: boolean;
  message: string;
};

export class PartnerLinkRequestError extends DomainError {
  constructor(keyOrMessage: string, status?: number) {
    super("PartnerLinkRequestError", keyOrMessage, status);
  }
}

function parsePartnerNamesJson(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .filter((value): value is string => typeof value === "string")
      .map((value) => value.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function normalizeName(value: string): string {
  return value.trim().toLowerCase();
}

function mapRequest(row: {
  id: bigint;
  opcoId: bigint;
  month: number;
  year: number;
  message: string;
  partnerNamesJson: string;
  status: string;
  createdAt: Date;
  decidedAt: Date | null;
  opco: { name: string };
}): AdminPartnerLinkRequestItem {
  const status =
    row.status === "APPROVED" || row.status === "REJECTED"
      ? row.status
      : "PENDING";
  return {
    id: row.id.toString(),
    opcoId: row.opcoId.toString(),
    opcoName: row.opco.name,
    periodLabel: formatPeriodLabel(row.year, row.month),
    month: row.month,
    year: row.year,
    message: row.message,
    partnerNames: parsePartnerNamesJson(row.partnerNamesJson),
    status,
    createdAt: row.createdAt.toISOString(),
    decidedAt: row.decidedAt?.toISOString() ?? null,
  };
}

export async function listAdminPartnerLinkRequests(params?: {
  status?: PartnerLinkRequestStatus | "all";
}): Promise<AdminPartnerLinkRequestItem[]> {
  const status = params?.status ?? "PENDING";
  const rows = await prisma.opcoPartnerLinkRequest.findMany({
    where: status === "all" ? undefined : { status },
    orderBy: { createdAt: "desc" },
    include: { opco: { select: { name: true } } },
    take: 100,
  });
  return rows.map(mapRequest);
}

export async function countPendingPartnerLinkRequests(): Promise<number> {
  return prisma.opcoPartnerLinkRequest.count({
    where: { status: "PENDING" },
  });
}

async function loadPendingRequest(idRaw: string) {
  if (!/^\d+$/.test(idRaw)) {
    throw new PartnerLinkRequestError("Invalid request id", 400);
  }
  const row = await prisma.opcoPartnerLinkRequest.findFirst({
    where: { id: BigInt(idRaw) },
    include: { opco: { select: { id: true, name: true } } },
  });
  if (!row) {
    throw new PartnerLinkRequestError("Partner link request not found", 404);
  }
  if (row.status !== "PENDING") {
    throw new PartnerLinkRequestError(
      "This request has already been decided",
      409,
    );
  }
  return row;
}

export async function acceptPartnerLinkRequest(params: {
  requestId: string;
  actorUserId: bigint;
}): Promise<AcceptPartnerLinkRequestResult> {
  const row = await loadPendingRequest(params.requestId);
  const partnerNames = parsePartnerNamesJson(row.partnerNamesJson);
  if (partnerNames.length === 0) {
    throw new PartnerLinkRequestError(
      "This request has no partner names left to link",
      400,
    );
  }

  const partners = await prisma.partner.findMany({
    where: { isDeleted: false },
    select: { id: true, name: true },
  });
  const byNormalizedName = new Map(
    partners.map((partner) => [normalizeName(partner.name), partner]),
  );

  const matched: Array<{ id: bigint; name: string }> = [];
  const missingPartnerNames: string[] = [];
  for (const name of partnerNames) {
    const partner = byNormalizedName.get(normalizeName(name));
    if (partner) {
      matched.push(partner);
    } else {
      missingPartnerNames.push(name);
    }
  }

  const linkedPartnerNames: string[] = [];
  for (const partner of matched) {
    await prisma.opcoPartnerLink.upsert({
      where: {
        opcoId_partnerId: { opcoId: row.opcoId, partnerId: partner.id },
      },
      create: {
        opcoId: row.opcoId,
        partnerId: partner.id,
        createdByUserId: params.actorUserId,
        updatedByUserId: params.actorUserId,
        isDeleted: false,
      },
      update: {
        isDeleted: false,
        deletedAt: null,
        deletedByUserId: null,
        updatedByUserId: params.actorUserId,
      },
    });
    linkedPartnerNames.push(partner.name);
  }

  const now = new Date();

  if (missingPartnerNames.length > 0) {
    const updated = await prisma.opcoPartnerLinkRequest.update({
      where: { id: row.id },
      data: {
        partnerNamesJson: JSON.stringify(missingPartnerNames),
        updatedAt: now,
      },
      include: { opco: { select: { name: true } } },
    });

    try {
      await notifyAdminUsers({
        fromUserId: params.actorUserId,
        subject: `Partner missing for link request: ${row.opco.name}`,
        body: [
          `${row.opco.name} link request still needs these partners created in Admin → Partners:`,
          "",
          ...missingPartnerNames.map((name) => `- ${name}`),
          "",
          linkedPartnerNames.length
            ? `Already linked: ${linkedPartnerNames.join(", ")}`
            : "No partners were linked yet.",
          "",
          "Create the missing Partners, then Accept the request again from OpCo partners → Requests.",
        ].join("\n"),
        metadata: {
          type: "PARTNER_LINK_REQUEST",
          opcoId: row.opcoId.toString(),
          opcoName: row.opco.name,
        },
      });
    } catch {
      // Linking succeeded; notification failure must not roll back.
    }

    return {
      request: mapRequest(updated),
      linkedPartnerNames,
      missingPartnerNames,
      approved: false,
      message: linkedPartnerNames.length
        ? `Linked ${linkedPartnerNames.length} partner(s). Create missing partners manually, then Accept again.`
        : "No matching partners found. Create them in Partners, then Accept again.",
    };
  }

  const updated = await prisma.opcoPartnerLinkRequest.update({
    where: { id: row.id },
    data: {
      status: "APPROVED",
      partnerNamesJson: JSON.stringify([]),
      decidedByUserId: params.actorUserId,
      decidedAt: now,
      decisionNote: null,
    },
    include: { opco: { select: { name: true } } },
  });

  await writeSettingsAuditLog({
    actorUserId: params.actorUserId,
    action: "SETTINGS_OPCO_PARTNER_LINK_UPDATED",
    message: `Partner link request approved for ${row.opco.name}.`,
    metadata: {
      requestId: row.id.toString(),
      opcoId: row.opcoId.toString(),
      linkedPartnerNames,
    },
  });

  try {
    await notifyOpcoUsers({
      opcoId: row.opcoId,
      fromUserId: params.actorUserId,
      subject: "Partner link created",
      body: [
        `Admin linked the following partners for ${formatPeriodLabel(row.year, row.month)}:`,
        "",
        ...linkedPartnerNames.map((name) => `- ${name}`),
        "",
        "You can upload your report now.",
      ].join("\n"),
      metadata: {
        type: "PARTNER_LINK_APPROVED",
        opcoId: row.opcoId.toString(),
        opcoName: row.opco.name,
      },
    });
  } catch {
    // Approval persisted; notification failure must not roll back.
  }

  return {
    request: mapRequest(updated),
    linkedPartnerNames,
    missingPartnerNames: [],
    approved: true,
    message: "Partner links created. OpCo has been notified.",
  };
}

export async function rejectPartnerLinkRequest(params: {
  requestId: string;
  actorUserId: bigint;
  decisionNote?: string;
}): Promise<AdminPartnerLinkRequestItem> {
  const row = await loadPendingRequest(params.requestId);
  const now = new Date();
  const decisionNote = params.decisionNote?.trim() || null;

  const updated = await prisma.opcoPartnerLinkRequest.update({
    where: { id: row.id },
    data: {
      status: "REJECTED",
      decidedByUserId: params.actorUserId,
      decidedAt: now,
      decisionNote,
    },
    include: { opco: { select: { name: true } } },
  });

  await writeSettingsAuditLog({
    actorUserId: params.actorUserId,
    action: "SETTINGS_OPCO_PARTNER_LINK_UPDATED",
    message: `Partner link request rejected for ${row.opco.name}.`,
    metadata: {
      requestId: row.id.toString(),
      opcoId: row.opcoId.toString(),
    },
  });

  const partnerNames = parsePartnerNamesJson(row.partnerNamesJson);
  try {
    await notifyOpcoUsers({
      opcoId: row.opcoId,
      fromUserId: params.actorUserId,
      subject: "Partner link request denied",
      body: [
        `Admin denied your partner link request for ${formatPeriodLabel(row.year, row.month)}.`,
        partnerNames.length
          ? `Partners: ${partnerNames.join(", ")}`
          : null,
        decisionNote ? `Note: ${decisionNote}` : null,
      ]
        .filter(Boolean)
        .join("\n"),
      metadata: {
        type: "PARTNER_LINK_REJECTED",
        opcoId: row.opcoId.toString(),
        opcoName: row.opco.name,
      },
    });
  } catch {
    // Rejection persisted; notification failure must not roll back.
  }

  return mapRequest(updated);
}

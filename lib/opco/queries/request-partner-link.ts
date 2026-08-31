/**
 * OpCo asks Admin to add missing OpCo–Partner links so a report file can be saved.
 */

import { formatPeriodLabel } from "@/lib/opco/period";
import type { RequestPartnerLinkInput } from "@/lib/opco/validation/request-partner-link";
import { DomainError } from "@/lib/errors/app-error";
import { notifyAdminUsers } from "@/lib/platform/notify-dizlee";
import {
  formatPartnerLinkRequestBody,
  partnerLinkRequestSubject,
} from "@/lib/platform/partner-link-request";
import { prisma } from "@/lib/prisma";

export class RequestPartnerLinkError extends DomainError {
  constructor(keyOrMessage: string, status?: number) {
    super("RequestPartnerLinkError", keyOrMessage, status);
  }
}

function uniquePartnerNames(names: string[]): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const raw of names) {
    const name = raw.trim();
    if (!name) {
      continue;
    }
    const key = name.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    unique.push(name);
  }
  return unique;
}

export async function requestPartnerLinkFromOpco(params: {
  opcoId: bigint;
  userId: bigint;
  input: RequestPartnerLinkInput;
}): Promise<void> {
  const opco = await prisma.opco.findFirst({
    where: { id: params.opcoId, isDeleted: false },
    select: { id: true, name: true },
  });
  if (!opco) {
    throw new RequestPartnerLinkError("OpCo not found", 404);
  }

  const partnerNames = uniquePartnerNames([
    ...params.input.unlinkedPartnerNames,
    ...params.input.unknownPartnerNames,
  ]);
  if (partnerNames.length === 0) {
    throw new RequestPartnerLinkError(
      "Add at least one partner name to request a link",
      400,
    );
  }

  const periodLabel = formatPeriodLabel(params.input.year, params.input.month);

  await prisma.opcoPartnerLinkRequest.create({
    data: {
      opcoId: opco.id,
      requestedByUserId: params.userId,
      month: params.input.month,
      year: params.input.year,
      message: params.input.message.trim(),
      partnerNamesJson: JSON.stringify(partnerNames),
      status: "PENDING",
    },
  });

  await notifyAdminUsers({
    fromUserId: params.userId,
    subject: partnerLinkRequestSubject(opco.name),
    body: formatPartnerLinkRequestBody({
      opcoId: opco.id.toString(),
      periodLabel,
      unlinkedPartnerNames: params.input.unlinkedPartnerNames,
      unknownPartnerNames: params.input.unknownPartnerNames,
      message: params.input.message,
    }),
    metadata: {
      type: "PARTNER_LINK_REQUEST",
      opcoId: opco.id.toString(),
      opcoName: opco.name,
    },
  });
}

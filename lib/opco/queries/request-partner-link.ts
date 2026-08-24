/**
 * OpCo asks Admin to add missing OpCo–Partner links so a report file can be saved.
 */

import { formatPeriodLabel } from "@/lib/opco/period";
import type { RequestPartnerLinkInput } from "@/lib/opco/validation/request-partner-link";
import { DomainError } from "@/lib/errors/app-error";
import { notifyAdminAndDizleeUsers } from "@/lib/platform/notify-dizlee";
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

  const periodLabel = formatPeriodLabel(params.input.year, params.input.month);
  await notifyAdminAndDizleeUsers({
    fromUserId: params.userId,
    subject: partnerLinkRequestSubject(opco.name),
    body: formatPartnerLinkRequestBody({
      opcoId: opco.id.toString(),
      periodLabel,
      unlinkedPartnerNames: params.input.unlinkedPartnerNames,
      unknownPartnerNames: params.input.unknownPartnerNames,
      message: params.input.message,
    }),
  });
}

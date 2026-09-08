/**
 * Persist outbound email delivery attempts. Failures here must never break send paths.
 */

import {
  classifySmtpError,
  parseBigIntId,
  truncateEmailSubject,
  type EmailDeliveryLogContext,
  type EmailDeliverySkipReason,
  type EmailDeliveryStatus,
} from "@/lib/auth/email-delivery.shared";
import { prisma } from "@/lib/prisma";

export type RecordEmailDeliveryInput = {
  toEmail: string;
  fromEmail?: string | null;
  subject: string;
  status: EmailDeliveryStatus;
  skipReason?: EmailDeliverySkipReason | null;
  providerMessageId?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  originalToEmail?: string | null;
  context?: EmailDeliveryLogContext | null;
};

export async function recordEmailDelivery(
  input: RecordEmailDeliveryInput,
): Promise<void> {
  try {
    const notificationId = parseBigIntId(input.context?.notificationId);
    const actorUserId = parseBigIntId(input.context?.actorUserId);
    const purpose = (input.context?.purpose ?? "PLATFORM").slice(0, 64);
    const correlationId = input.context?.correlationId?.trim().slice(0, 64) || null;

    await prisma.emailDelivery.create({
      data: {
        toEmail: input.toEmail.trim().slice(0, 255),
        fromEmail: input.fromEmail?.trim().slice(0, 255) || null,
        subject: truncateEmailSubject(input.subject),
        purpose,
        notificationId,
        status: input.status,
        skipReason: input.skipReason ?? null,
        providerMessageId: input.providerMessageId?.slice(0, 255) || null,
        errorCode: input.errorCode?.slice(0, 64) || null,
        errorMessage: input.errorMessage ?? null,
        originalToEmail: input.originalToEmail?.trim().slice(0, 255) || null,
        actorUserId,
        correlationId,
      },
    });
  } catch (error) {
    console.error("[email-delivery] Failed to persist delivery log:", error);
  }
}

export async function recordEmailDeliveryFailure(
  params: {
    toEmail: string;
    fromEmail?: string | null;
    subject: string;
    originalToEmail?: string | null;
    context?: EmailDeliveryLogContext | null;
    error: unknown;
  },
): Promise<void> {
  const classified = classifySmtpError(params.error);
  await recordEmailDelivery({
    toEmail: params.toEmail,
    fromEmail: params.fromEmail,
    subject: params.subject,
    status: "FAILED",
    errorCode: classified.errorCode,
    errorMessage: classified.errorMessage,
    originalToEmail: params.originalToEmail,
    context: params.context,
  });
}

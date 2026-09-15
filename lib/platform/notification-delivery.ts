/**
 * Server-side notification email delivery (Nodemailer + Prisma user lookup).
 * Import channel helpers from notification-delivery.shared for client-safe usage.
 */

import { randomUUID } from "crypto";

import {
  sendPlatformEmail,
  type SendPlatformEmailAttachment,
} from "@/lib/auth/mail";
import type { EmailDeliveryPurpose } from "@/lib/auth/email-delivery.shared";
import { getEmailDeliveryReadiness } from "@/lib/auth/email-delivery-readiness";
import { resolveSmtpConfig } from "@/lib/auth/smtp-config";
import {
  deliverySendsEmail,
  NotificationDeliveryError,
  notificationBodyToEmailHtml,
  type NotificationDeliveryChannel,
  type SendNotificationEmailsResult,
} from "@/lib/platform/notification-delivery.shared";
import { prisma } from "@/lib/prisma";

export type OrgEmailRecipient = {
  email: string;
  name: string | null;
};

/** Active OpCo/Partner users for the selected orgs; emails deduped case-insensitively. */
export async function resolveOrgUserEmails(params: {
  opcoIds: bigint[];
  partnerIds: bigint[];
}): Promise<OrgEmailRecipient[]> {
  if (params.opcoIds.length === 0 && params.partnerIds.length === 0) {
    return [];
  }

  const users = await prisma.user.findMany({
    where: {
      status: { code: "ACTIVE" },
      OR: [
        ...(params.opcoIds.length > 0
          ? [{ opcoId: { in: params.opcoIds } }]
          : []),
        ...(params.partnerIds.length > 0
          ? [{ partnerId: { in: params.partnerIds } }]
          : []),
      ],
    },
    select: { email: true, name: true },
    orderBy: { email: "asc" },
  });

  const byEmail = new Map<string, OrgEmailRecipient>();
  for (const user of users) {
    const email = user.email.trim();
    if (!email) {
      continue;
    }
    const key = email.toLowerCase();
    if (!byEmail.has(key)) {
      byEmail.set(key, { email, name: user.name });
    }
  }

  return [...byEmail.values()];
}

/** Fail closed when Email/Both is selected but SMTP is off or incomplete. */
export async function assertEmailDeliveryReady(): Promise<void> {
  const readiness = await getEmailDeliveryReadiness();
  if (readiness.ready) {
    return;
  }

  if (readiness.reason === "email_disabled") {
    throw new NotificationDeliveryError(
      "Email delivery is disabled. Enable email in Admin → Email settings, or choose System notification.",
      400,
    );
  }

  if (readiness.reason === "smtp_credentials_missing") {
    throw new NotificationDeliveryError(
      "Email credentials are missing. Enter SMTP user and password in Admin → Email settings, or choose System notification.",
      400,
    );
  }

  throw new NotificationDeliveryError(
    "Email is not configured. Set SMTP in Admin → Email settings, or choose System notification.",
    400,
  );
}

export async function sendNotificationEmails(params: {
  recipients: OrgEmailRecipient[];
  subject: string;
  text?: string;
  body: string;
  purpose?: EmailDeliveryPurpose;
  notificationId?: bigint | string | null;
  actorUserId?: bigint | string | null;
  correlationId?: string | null;
  attachments?: SendPlatformEmailAttachment[];
  onProgress?: (progress: {
    sent: number;
    failed: number;
    total: number;
  }) => void | Promise<void>;
}): Promise<SendNotificationEmailsResult> {
  const html = notificationBodyToEmailHtml(params.body);
  const correlationId = params.correlationId?.trim() || randomUUID();
  const purpose = params.purpose ?? "NOTIFICATION";
  const total = params.recipients.length;
  let sent = 0;
  let failed = 0;

  if (total > 0) {
    await params.onProgress?.({ sent: 0, failed: 0, total });
  }

  for (const recipient of params.recipients) {
    try {
      const result = await sendPlatformEmail({
        to: recipient.email,
        subject: params.subject,
        text: params.text ?? params.body,
        html,
        attachments: params.attachments,
        logContext: {
          purpose,
          notificationId: params.notificationId,
          actorUserId: params.actorUserId,
          correlationId,
        },
      });
      if (result.sent) {
        sent += 1;
      } else {
        failed += 1;
      }
    } catch {
      failed += 1;
    }
    await params.onProgress?.({ sent, failed, total });
  }

  return {
    attempted: total,
    sent,
    failed,
  };
}

export async function prepareEmailDelivery(params: {
  channel: NotificationDeliveryChannel;
  opcoIds: bigint[];
  partnerIds: bigint[];
}): Promise<OrgEmailRecipient[]> {
  if (!deliverySendsEmail(params.channel)) {
    return [];
  }

  await assertEmailDeliveryReady();
  const recipients = await resolveOrgUserEmails({
    opcoIds: params.opcoIds,
    partnerIds: params.partnerIds,
  });

  if (recipients.length === 0) {
    throw new NotificationDeliveryError(
      "No active user emails found for the selected OpCos/Partners. Add users or choose System notification.",
      400,
    );
  }

  return recipients;
}

/** Resolve emails for specific user IDs (ACTIVE only); deduped. */
export async function resolveUserEmailsByIds(
  userIds: bigint[],
): Promise<OrgEmailRecipient[]> {
  if (userIds.length === 0) {
    return [];
  }

  const users = await prisma.user.findMany({
    where: {
      id: { in: userIds },
      status: { code: "ACTIVE" },
    },
    select: { email: true, name: true },
  });

  const byEmail = new Map<string, OrgEmailRecipient>();
  for (const user of users) {
    const email = user.email.trim();
    if (!email) {
      continue;
    }
    const key = email.toLowerCase();
    if (!byEmail.has(key)) {
      byEmail.set(key, { email, name: user.name });
    }
  }
  return [...byEmail.values()];
}

/**
 * Event-driven email fan-out: never blocks the business action if SMTP is off.
 * Used by upload / invoice / link / reupload system notices (default Both).
 */
export async function maybeSendEventEmails(params: {
  channel: NotificationDeliveryChannel;
  recipients: OrgEmailRecipient[];
  subject: string;
  body: string;
  purpose?: EmailDeliveryPurpose;
  notificationId?: bigint | string | null;
  actorUserId?: bigint | string | null;
  correlationId?: string | null;
  attachments?: SendPlatformEmailAttachment[];
  onProgress?: (progress: {
    sent: number;
    failed: number;
    total: number;
  }) => void | Promise<void>;
}): Promise<SendNotificationEmailsResult | null> {
  if (!deliverySendsEmail(params.channel) || params.recipients.length === 0) {
    return null;
  }

  const smtp = await resolveSmtpConfig();
  if (!smtp.ok) {
    console.warn(
      `[notification-delivery] Skipping event emails (${smtp.reason}): ${params.subject}`,
    );
  }

  return sendNotificationEmails({
    recipients: params.recipients,
    subject: params.subject,
    body: params.body,
    purpose: params.purpose ?? "EVENT",
    notificationId: params.notificationId,
    actorUserId: params.actorUserId,
    correlationId: params.correlationId,
    attachments: params.attachments,
    onProgress: params.onProgress,
  });
}

export type {
  NotificationDeliveryChannel,
  SendNotificationEmailsResult,
} from "@/lib/platform/notification-delivery.shared";

export {
  DEFAULT_NOTIFICATION_DELIVERY_CHANNEL,
  NOTIFICATION_DELIVERY_CHANNELS,
  NotificationDeliveryError,
  deliveryChannelLabel,
  deliveryCreatesInboxRecipients,
  deliverySendsEmail,
  formatDeliveryMessage,
  inboxDeliveryChannelFilter,
  isNotificationDeliveryChannel,
  notificationBodyToEmailHtml,
  parseDeliveryChannel,
} from "@/lib/platform/notification-delivery.shared";

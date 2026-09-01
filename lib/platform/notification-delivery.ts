/**
 * Server-side notification email delivery (Nodemailer + Prisma user lookup).
 * Import channel helpers from notification-delivery.shared for client-safe usage.
 */

import { sendPlatformEmail } from "@/lib/auth/mail";
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
  const smtp = await resolveSmtpConfig();
  if (smtp.ok) {
    return;
  }

  if (smtp.reason === "email_disabled") {
    throw new NotificationDeliveryError(
      "Email delivery is disabled. Enable email in Admin → Email settings, or choose System notification.",
      400,
    );
  }

  throw new NotificationDeliveryError(
    "Email is not configured. Set SMTP in Admin → Email settings (and SMTP_USER/SMTP_PASSWORD in .env), or choose System notification.",
    400,
  );
}

export async function sendNotificationEmails(params: {
  recipients: OrgEmailRecipient[];
  subject: string;
  body: string;
}): Promise<SendNotificationEmailsResult> {
  const html = notificationBodyToEmailHtml(params.body);
  let sent = 0;
  let failed = 0;

  for (const recipient of params.recipients) {
    try {
      const result = await sendPlatformEmail({
        to: recipient.email,
        subject: params.subject,
        text: params.body,
        html,
      });
      if (result.sent) {
        sent += 1;
      } else {
        failed += 1;
      }
    } catch {
      failed += 1;
    }
  }

  return {
    attempted: params.recipients.length,
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
}): Promise<SendNotificationEmailsResult | null> {
  if (!deliverySendsEmail(params.channel) || params.recipients.length === 0) {
    return null;
  }

  const smtp = await resolveSmtpConfig();
  if (!smtp.ok) {
    console.warn(
      `[notification-delivery] Skipping event emails (${smtp.reason}): ${params.subject}`,
    );
    return null;
  }

  return sendNotificationEmails({
    recipients: params.recipients,
    subject: params.subject,
    body: params.body,
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

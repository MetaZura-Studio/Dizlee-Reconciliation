/**
 * Client-safe notification delivery channel types and pure helpers.
 * Keep Nodemailer / Prisma email dispatch in notification-delivery.ts (server only).
 */

import { DomainError } from "@/lib/errors/app-error";

export const NOTIFICATION_DELIVERY_CHANNELS = [
  "SYSTEM",
  "EMAIL",
  "BOTH",
] as const;

export type NotificationDeliveryChannel =
  (typeof NOTIFICATION_DELIVERY_CHANNELS)[number];

export const DEFAULT_NOTIFICATION_DELIVERY_CHANNEL: NotificationDeliveryChannel =
  "BOTH";

export class NotificationDeliveryError extends DomainError {
  constructor(keyOrMessage: string, status?: number) {
    super("NotificationDeliveryError", keyOrMessage, status);
  }
}

export function isNotificationDeliveryChannel(
  value: string,
): value is NotificationDeliveryChannel {
  return (NOTIFICATION_DELIVERY_CHANNELS as readonly string[]).includes(value);
}

/** Parse channel from API/UI input; default BOTH for manual sends. */
export function parseDeliveryChannel(
  value: string | null | undefined,
  fallback: NotificationDeliveryChannel = DEFAULT_NOTIFICATION_DELIVERY_CHANNEL,
): NotificationDeliveryChannel {
  if (value == null || value === "") {
    return fallback;
  }
  const normalized = value.trim().toUpperCase();
  if (!isNotificationDeliveryChannel(normalized)) {
    throw new NotificationDeliveryError(
      "Delivery method must be System, Email, or Both.",
      400,
    );
  }
  return normalized;
}

export function deliveryCreatesInboxRecipients(
  channel: NotificationDeliveryChannel,
): boolean {
  return channel === "SYSTEM" || channel === "BOTH";
}

export function deliverySendsEmail(
  channel: NotificationDeliveryChannel,
): boolean {
  return channel === "EMAIL" || channel === "BOTH";
}

export function deliveryChannelLabel(
  channel: string | null | undefined,
): string {
  switch ((channel ?? "SYSTEM").toUpperCase()) {
    case "EMAIL":
      return "Email";
    case "BOTH":
      return "System + Email";
    default:
      return "System";
  }
}

/** Inbox / bell visibility — EMAIL-only stays in Outbox history only. */
export function inboxDeliveryChannelFilter(): {
  deliveryChannel: { in: NotificationDeliveryChannel[] };
} {
  return { deliveryChannel: { in: ["SYSTEM", "BOTH"] } };
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function notificationBodyToEmailHtml(body: string): string {
  const escaped = escapeHtml(body);
  return `<div style="font-family:sans-serif;white-space:pre-wrap;line-height:1.5">${escaped.replace(/\n/g, "<br/>")}</div>`;
}

export type SendNotificationEmailsResult = {
  attempted: number;
  sent: number;
  failed: number;
};

export function formatDeliveryMessage(params: {
  channel: NotificationDeliveryChannel;
  baseMessage: string;
  emailResult?: SendNotificationEmailsResult | null;
}): string {
  if (!params.emailResult || !deliverySendsEmail(params.channel)) {
    return params.baseMessage;
  }

  const { sent, failed, attempted } = params.emailResult;
  const emailPart =
    failed > 0
      ? `Emailed ${sent} of ${attempted} users (${failed} failed).`
      : `Emailed ${sent} user${sent === 1 ? "" : "s"}.`;

  if (params.channel === "EMAIL") {
    return emailPart;
  }

  return `${params.baseMessage} ${emailPart}`;
}

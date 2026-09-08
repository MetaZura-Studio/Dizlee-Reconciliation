/**
 * Client-safe email/SMTP readiness snapshot (no secrets).
 * Used by Dizlee compose UIs to warn when Email/Both is selected.
 */

import {
  resolveSmtpConfig,
  type SmtpResolutionResult,
} from "@/lib/auth/smtp-config";

export type EmailDeliveryNotReadyReason =
  | "email_disabled"
  | "smtp_not_configured"
  | "smtp_credentials_missing";

export type EmailDeliveryReadiness = {
  ready: boolean;
  reason: EmailDeliveryNotReadyReason | null;
};

/** Pure check used by API + assertEmailDeliveryReady (host alone is not enough). */
export function emailDeliveryReadinessFromSmtp(
  smtp: SmtpResolutionResult,
): EmailDeliveryReadiness {
  if (!smtp.ok) {
    return { ready: false, reason: smtp.reason };
  }

  if (!smtp.config.auth) {
    return { ready: false, reason: "smtp_credentials_missing" };
  }

  return { ready: true, reason: null };
}

export async function getEmailDeliveryReadiness(): Promise<EmailDeliveryReadiness> {
  return emailDeliveryReadinessFromSmtp(await resolveSmtpConfig());
}

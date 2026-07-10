import { writeSettingsAuditLog } from "@/lib/admin/audit";
import {
  sendTestEmailSchema,
  type SendTestEmailInput,
} from "@/lib/admin/validation/email-settings";
import { sendPlatformEmail } from "@/lib/auth/mail";
import {
  getEmailSettingsFromEnv,
  resolveSmtpConfigFromEnv,
} from "@/lib/auth/smtp-config";

export type EmailSettingsView = {
  emailEnabled: boolean;
  senderAddress: string | null;
  smtpHost: string | null;
  smtpPort: number | null;
};

export class EmailSettingsError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "EmailSettingsError";
    this.status = status;
  }
}

export async function getEmailSettings(): Promise<EmailSettingsView> {
  return getEmailSettingsFromEnv();
}

export async function updateEmailSettings(): Promise<EmailSettingsView> {
  throw new EmailSettingsError(
    "SMTP settings are read from the server .env file. Update EMAIL_ENABLED, SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, and SMTP_FROM there, then restart the dev server.",
  );
}

export async function sendTestEmail(
  rawInput: SendTestEmailInput,
  actorUserId: bigint,
): Promise<{ recipient: string }> {
  const parsed = sendTestEmailSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new EmailSettingsError(
      parsed.error.issues[0]?.message ?? "Invalid input",
    );
  }

  const smtpResult = resolveSmtpConfigFromEnv();
  if (!smtpResult.ok) {
    if (smtpResult.reason === "email_disabled") {
      throw new EmailSettingsError(
        "Email is disabled. Set EMAIL_ENABLED=true in .env or configure SMTP_HOST.",
      );
    }
    throw new EmailSettingsError(
      "SMTP is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, and SMTP_FROM in .env, then restart the dev server.",
    );
  }

  const recipient = parsed.data.recipient.toLowerCase();
  const result = await sendPlatformEmail({
    to: recipient,
    subject: "Dizlee Reconciliation test email",
    text: "This is a test email from Dizlee Reconciliation. If you received this message, outbound email is configured correctly.",
    html: `<p>This is a test email from <strong>Dizlee Reconciliation</strong>.</p><p>If you received this message, outbound email is configured correctly.</p>`,
  });

  if (!result.sent) {
    if (result.reason === "email_disabled") {
      throw new EmailSettingsError(
        "Email is disabled. Set EMAIL_ENABLED=true in .env or configure SMTP_HOST.",
      );
    }
    if (result.reason === "smtp_not_configured") {
      throw new EmailSettingsError(
        "SMTP is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, and SMTP_FROM in .env, then restart the dev server.",
      );
    }
    throw new EmailSettingsError("Failed to send test email.");
  }

  await writeSettingsAuditLog({
    actorUserId,
    action: "EMAIL_TEST_SENT",
    message: `Test email sent to ${recipient}.`,
    metadata: { recipient },
  });

  return { recipient };
}

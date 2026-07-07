import { writeSettingsAuditLog } from "@/lib/admin/audit";
import {
  sendTestEmailSchema,
  updateEmailSettingsSchema,
  type SendTestEmailInput,
  type UpdateEmailSettingsInput,
} from "@/lib/admin/validation/email-settings";
import { sendPlatformEmail } from "@/lib/auth/mail";
import { prisma } from "@/lib/prisma";

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

function mapSettingsRow(row: {
  emailEnabled: boolean;
  senderAddress: string | null;
  smtpHost: string | null;
  smtpPort: number | null;
}): EmailSettingsView {
  return {
    emailEnabled: row.emailEnabled,
    senderAddress: row.senderAddress,
    smtpHost: row.smtpHost,
    smtpPort: row.smtpPort,
  };
}

export async function getEmailSettings(): Promise<EmailSettingsView> {
  const settings = await prisma.appSettings.findFirst({
    where: { id: 1 },
    select: {
      emailEnabled: true,
      senderAddress: true,
      smtpHost: true,
      smtpPort: true,
    },
  });

  if (!settings) {
    throw new EmailSettingsError(
      "Application settings could not be loaded.",
      500,
    );
  }

  return mapSettingsRow(settings);
}

export async function updateEmailSettings(
  rawInput: UpdateEmailSettingsInput,
  actorUserId: bigint,
): Promise<EmailSettingsView> {
  const parsed = updateEmailSettingsSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new EmailSettingsError(
      parsed.error.issues[0]?.message ?? "Invalid input",
    );
  }

  const updated = await prisma.appSettings.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      emailEnabled: parsed.data.emailEnabled,
      senderAddress: parsed.data.senderAddress ?? null,
      smtpHost: parsed.data.smtpHost ?? null,
      smtpPort: parsed.data.smtpPort ?? null,
    },
    update: {
      emailEnabled: parsed.data.emailEnabled,
      senderAddress: parsed.data.senderAddress ?? null,
      smtpHost: parsed.data.smtpHost ?? null,
      smtpPort: parsed.data.smtpPort ?? null,
    },
    select: {
      emailEnabled: true,
      senderAddress: true,
      smtpHost: true,
      smtpPort: true,
    },
  });

  await writeSettingsAuditLog({
    actorUserId,
    action: "SETTINGS_EMAIL_UPDATED",
    message: "Email notification settings updated.",
    metadata: {
      emailEnabled: updated.emailEnabled,
      senderAddress: updated.senderAddress,
      smtpHost: updated.smtpHost,
      smtpPort: updated.smtpPort,
    },
  });

  return mapSettingsRow(updated);
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

  const settings = await getEmailSettings();
  if (!settings.emailEnabled) {
    throw new EmailSettingsError(
      "Enable email notifications before sending a test email.",
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
        "Enable email notifications before sending a test email.",
      );
    }
    if (result.reason === "smtp_not_configured") {
      throw new EmailSettingsError(
        "SMTP is not configured. Set SMTP host in email settings and credentials in server environment variables.",
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

/**
 * Admin outbound email configuration — DB overrides merged with SMTP env credentials.
 * Supports test send and audit on change; secrets never returned in the view model.
 */
import type { Prisma } from "@prisma/client";

import { writeSettingsAuditLog } from "@/lib/admin/audit";
import {
  sendTestEmailSchema,
  updateEmailSettingsSchema,
  type SendTestEmailInput,
  type UpdateEmailSettingsInput,
} from "@/lib/admin/validation/email-settings";
import { sendPlatformEmail } from "@/lib/auth/mail";
import {
  getEmailSettingsFromEnv,
  normalizeSmtpHost,
  resolveSmtpConfig,
} from "@/lib/auth/smtp-config";
import { prisma } from "@/lib/prisma";

export type EmailSettingsView = {
  emailEnabled: boolean;
  senderAddress: string | null;
  smtpHost: string | null;
  smtpPort: number | null;
  smtpUserConfigured: boolean;
  smtpPasswordConfigured: boolean;
};

export class EmailSettingsError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "EmailSettingsError";
    this.status = status;
  }
}

function credentialFlags() {
  return {
    smtpUserConfigured: Boolean(process.env.SMTP_USER?.trim()),
    smtpPasswordConfigured: Boolean(process.env.SMTP_PASSWORD),
  };
}

function mapMergedSettings(row: {
  emailEnabled: boolean;
  senderAddress: string | null;
  smtpHost: string | null;
  smtpPort: number | null;
} | null): EmailSettingsView {
  const env = getEmailSettingsFromEnv();
  const dbHost = normalizeSmtpHost(row?.smtpHost);
  const hasDbHost = Boolean(dbHost);

  return {
    emailEnabled: hasDbHost ? Boolean(row?.emailEnabled) : env.emailEnabled,
    smtpHost: hasDbHost ? dbHost : env.smtpHost,
    smtpPort: hasDbHost
      ? (row?.smtpPort ?? 587)
      : (env.smtpPort ?? 587),
    senderAddress: hasDbHost
      ? (row?.senderAddress?.trim() || env.senderAddress)
      : env.senderAddress,
    ...credentialFlags(),
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

  return mapMergedSettings(settings);
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

  const smtpHost = normalizeSmtpHost(parsed.data.smtpHost) || null;
  const data: Prisma.AppSettingsUpdateInput = {
    emailEnabled: parsed.data.emailEnabled,
    smtpHost,
    smtpPort: parsed.data.smtpPort ?? 587,
    senderAddress: parsed.data.senderAddress,
  };

  const updated = await prisma.appSettings.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      emailEnabled: parsed.data.emailEnabled,
      smtpHost,
      smtpPort: parsed.data.smtpPort ?? 587,
      senderAddress: parsed.data.senderAddress,
    },
    update: data,
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
      smtpHost: updated.smtpHost,
      smtpPort: updated.smtpPort,
      senderAddress: updated.senderAddress,
    },
  });

  return mapMergedSettings(updated);
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

  const smtpResult = await resolveSmtpConfig();
  if (!smtpResult.ok) {
    if (smtpResult.reason === "email_disabled") {
      throw new EmailSettingsError(
        "Email is disabled. Enable it in Email Settings and save.",
      );
    }
    throw new EmailSettingsError(
      "SMTP is not configured. Save SMTP host, port, and sender in Email Settings, and set SMTP_USER / SMTP_PASSWORD in .env.",
    );
  }

  if (!smtpResult.config.auth) {
    throw new EmailSettingsError(
      "SMTP credentials are missing. Set SMTP_USER and SMTP_PASSWORD in .env, then restart the server.",
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
        "Email is disabled. Enable it in Email Settings and save.",
      );
    }
    if (result.reason === "smtp_not_configured") {
      throw new EmailSettingsError(
        "SMTP is not configured. Save SMTP host, port, and sender in Email Settings, and set SMTP_USER / SMTP_PASSWORD in .env.",
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

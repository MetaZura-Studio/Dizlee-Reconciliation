/**
 * Admin outbound email configuration — DB settings with optional encrypted SMTP credentials.
 * Secrets are never returned in the view model (masked flags only).
 */
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
import { encryptSmtpPassword } from "@/lib/platform/smtp-credentials-crypto";
import { prisma } from "@/lib/prisma";
import { DomainError } from "@/lib/errors/app-error";

export type EmailSettingsView = {
  emailEnabled: boolean;
  senderAddress: string | null;
  smtpHost: string | null;
  smtpPort: number | null;
  smtpUserConfigured: boolean;
  smtpPasswordConfigured: boolean;
  /** True when credentials come from Admin DB (vs .env only). */
  smtpCredentialsFromDb: boolean;
};

export class EmailSettingsError extends DomainError {
  constructor(keyOrMessage: string, status?: number) {
    super("EmailSettingsError", keyOrMessage, status);
  }
}

function mapMergedSettings(row: {
  emailEnabled: boolean;
  senderAddress: string | null;
  smtpHost: string | null;
  smtpPort: number | null;
  smtpUser: string | null;
  smtpPasswordEnc: string | null;
} | null): EmailSettingsView {
  const env = getEmailSettingsFromEnv();
  const dbHost = normalizeSmtpHost(row?.smtpHost);
  const hasDbHost = Boolean(dbHost);
  const dbUserConfigured = Boolean(row?.smtpUser?.trim());
  const dbPasswordConfigured = Boolean(row?.smtpPasswordEnc?.trim());
  const smtpCredentialsFromDb = dbUserConfigured && dbPasswordConfigured;
  const envUserConfigured = Boolean(process.env.SMTP_USER?.trim());
  const envPasswordConfigured = Boolean(process.env.SMTP_PASSWORD);

  return {
    emailEnabled: hasDbHost ? Boolean(row?.emailEnabled) : env.emailEnabled,
    smtpHost: hasDbHost ? dbHost : env.smtpHost,
    smtpPort: hasDbHost
      ? (row?.smtpPort ?? 587)
      : (env.smtpPort ?? 587),
    senderAddress: hasDbHost
      ? (row?.senderAddress?.trim() || env.senderAddress)
      : env.senderAddress,
    smtpUserConfigured: smtpCredentialsFromDb || envUserConfigured,
    smtpPasswordConfigured: smtpCredentialsFromDb || envPasswordConfigured,
    smtpCredentialsFromDb,
  };
}

const settingsSelect = {
  emailEnabled: true,
  senderAddress: true,
  smtpHost: true,
  smtpPort: true,
  smtpUser: true,
  smtpPasswordEnc: true,
} as const;

export async function getEmailSettings(): Promise<EmailSettingsView> {
  const settings = await prisma.appSettings.findFirst({
    where: { id: 1 },
    select: settingsSelect,
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

  const existing = await prisma.appSettings.findFirst({
    where: { id: 1 },
    select: settingsSelect,
  });

  const smtpHost = normalizeSmtpHost(parsed.data.smtpHost) || null;
  let nextSmtpUser: string | null | undefined = undefined;
  let nextSmtpPasswordEnc: string | null | undefined = undefined;

  if (parsed.data.clearSmtpCredentials) {
    nextSmtpUser = null;
    nextSmtpPasswordEnc = null;
  } else {
    const incomingUser = parsed.data.smtpUser?.trim() ?? "";
    const incomingPassword = parsed.data.smtpPassword ?? "";
    if (incomingUser && incomingPassword) {
      try {
        nextSmtpUser = incomingUser;
        nextSmtpPasswordEnc = encryptSmtpPassword(incomingPassword);
      } catch (error) {
        throw new EmailSettingsError(
          error instanceof Error
            ? error.message
            : "Could not encrypt SMTP password. Check NEXTAUTH_SECRET.",
        );
      }
    }
  }

  const effectiveUser =
    nextSmtpUser !== undefined ? nextSmtpUser : (existing?.smtpUser ?? null);
  const effectivePasswordEnc =
    nextSmtpPasswordEnc !== undefined
      ? nextSmtpPasswordEnc
      : (existing?.smtpPasswordEnc ?? null);
  const willHaveDbCredentials =
    Boolean(effectiveUser?.trim()) && Boolean(effectivePasswordEnc?.trim());

  const envHasCredentials =
    Boolean(process.env.SMTP_USER?.trim()) &&
    Boolean(process.env.SMTP_PASSWORD);

  if (parsed.data.emailEnabled && !willHaveDbCredentials && !envHasCredentials) {
    throw new EmailSettingsError(
      "SMTP user and password are required when email is enabled. Enter them here or set SMTP_USER / SMTP_PASSWORD in .env.",
    );
  }

  const updated = await prisma.appSettings.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      emailEnabled: parsed.data.emailEnabled,
      smtpHost,
      smtpPort: parsed.data.smtpPort ?? 587,
      senderAddress: parsed.data.senderAddress,
      smtpUser: nextSmtpUser ?? null,
      smtpPasswordEnc: nextSmtpPasswordEnc ?? null,
    },
    update: {
      emailEnabled: parsed.data.emailEnabled,
      smtpHost,
      smtpPort: parsed.data.smtpPort ?? 587,
      senderAddress: parsed.data.senderAddress,
      ...(nextSmtpUser !== undefined ? { smtpUser: nextSmtpUser } : {}),
      ...(nextSmtpPasswordEnc !== undefined
        ? { smtpPasswordEnc: nextSmtpPasswordEnc }
        : {}),
    },
    select: settingsSelect,
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
      smtpCredentialsUpdated: Boolean(
        parsed.data.clearSmtpCredentials ||
          (parsed.data.smtpUser?.trim() && parsed.data.smtpPassword),
      ),
      smtpCredentialsCleared: Boolean(parsed.data.clearSmtpCredentials),
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
      "SMTP is not configured. Save SMTP host, port, sender, user, and password in Email Settings.",
    );
  }

  if (!smtpResult.config.auth) {
    throw new EmailSettingsError(
      "SMTP credentials are missing. Enter SMTP user and password in Email Settings (or set SMTP_USER / SMTP_PASSWORD in .env).",
    );
  }

  const recipient = parsed.data.recipient.toLowerCase();
  const result = await sendPlatformEmail({
    to: recipient,
    subject: "Dizlee Reconciliation test email",
    text: "This is a test email from Dizlee Reconciliation. If you received this message, outbound email is configured correctly.",
    html: `<p>This is a test email from <strong>Dizlee Reconciliation</strong>.</p><p>If you received this message, outbound email is configured correctly.</p>`,
    logContext: {
      purpose: "ADMIN_TEST",
      actorUserId,
    },
  });

  if (!result.sent) {
    if (result.reason === "email_disabled") {
      throw new EmailSettingsError(
        "Email is disabled. Enable it in Email Settings and save.",
      );
    }
    if (result.reason === "smtp_not_configured") {
      throw new EmailSettingsError(
        "SMTP is not configured. Save SMTP host, port, sender, user, and password in Email Settings.",
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

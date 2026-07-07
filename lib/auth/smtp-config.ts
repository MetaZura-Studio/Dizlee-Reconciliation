import { prisma } from "@/lib/prisma";

export type ResolvedSmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  auth?: { user: string; pass: string };
  from: string;
};

export type SmtpResolutionResult =
  | { ok: true; config: ResolvedSmtpConfig }
  | { ok: false; reason: "email_disabled" | "smtp_not_configured" };

export type EmailSettingsSnapshot = {
  emailEnabled: boolean;
  senderAddress: string | null;
  smtpHost: string | null;
  smtpPort: number | null;
};

export function resolveSmtpConfigFromSnapshot(
  settings: EmailSettingsSnapshot | null,
): SmtpResolutionResult {
  if (settings && !settings.emailEnabled) {
    return { ok: false, reason: "email_disabled" };
  }

  const host =
    settings?.smtpHost?.trim() || process.env.SMTP_HOST?.trim() || "";
  const port = settings?.smtpPort ?? Number(process.env.SMTP_PORT ?? "587");
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASSWORD;
  const from =
    settings?.senderAddress?.trim() ||
    process.env.SMTP_FROM?.trim() ||
    process.env.SENDER_ADDRESS?.trim() ||
    "noreply@dizlee.com";

  if (!host) {
    return { ok: false, reason: "smtp_not_configured" };
  }

  return {
    ok: true,
    config: {
      host,
      port,
      secure: port === 465,
      auth: user && pass ? { user, pass } : undefined,
      from,
    },
  };
}

export async function resolveSmtpConfig(): Promise<SmtpResolutionResult> {
  const settings = await prisma.appSettings.findFirst({
    where: { id: 1 },
    select: {
      emailEnabled: true,
      senderAddress: true,
      smtpHost: true,
      smtpPort: true,
    },
  });

  return resolveSmtpConfigFromSnapshot(settings);
}

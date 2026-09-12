/**
 * SMTP resolution from Admin Email Settings with .env credential fallback.
 * DB controls host/port/from/enabled and optional user/password; env fills gaps.
 */

import {
  tryDecryptSmtpPassword,
} from "@/lib/platform/smtp-credentials-crypto";
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

const PLACEHOLDER_SMTP_HOSTS = new Set(["smtp.example.com", "example.com"]);

export function normalizeSmtpHost(host: string | null | undefined): string {
  const trimmed = host?.trim() ?? "";
  if (!trimmed || PLACEHOLDER_SMTP_HOSTS.has(trimmed.toLowerCase())) {
    return "";
  }
  return trimmed;
}

function parseEnvPort(): number {
  const raw = process.env.SMTP_PORT?.trim();
  if (!raw) {
    return 587;
  }

  const port = Number(raw);
  return Number.isFinite(port) && port > 0 ? port : 587;
}

export function isEmailEnabledFromEnv(): boolean {
  const raw = process.env.EMAIL_ENABLED?.trim().toLowerCase();
  if (raw === "false" || raw === "0" || raw === "no") {
    return false;
  }
  if (raw === "true" || raw === "1" || raw === "yes") {
    return true;
  }

  return Boolean(normalizeSmtpHost(process.env.SMTP_HOST));
}

export function getEmailSettingsFromEnv(): {
  emailEnabled: boolean;
  senderAddress: string | null;
  smtpHost: string | null;
  smtpPort: number | null;
} {
  const smtpHost = normalizeSmtpHost(process.env.SMTP_HOST) || null;
  const port = parseEnvPort();

  return {
    emailEnabled: isEmailEnabledFromEnv(),
    senderAddress:
      process.env.SMTP_FROM?.trim() ||
      process.env.SENDER_ADDRESS?.trim() ||
      null,
    smtpHost,
    smtpPort: smtpHost ? port : null,
  };
}

function authFromEnv(): { user: string; pass: string } | undefined {
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASSWORD;
  if (user && pass) {
    return { user, pass };
  }
  return undefined;
}

function authFromDb(row: {
  smtpUser: string | null;
  smtpPasswordEnc: string | null;
} | null): { user: string; pass: string } | undefined {
  const user = row?.smtpUser?.trim();
  const pass = tryDecryptSmtpPassword(row?.smtpPasswordEnc);
  if (user && pass) {
    return { user, pass };
  }
  return undefined;
}

export function resolveSmtpConfigFromEnv(): SmtpResolutionResult {
  if (!isEmailEnabledFromEnv()) {
    return { ok: false, reason: "email_disabled" };
  }

  const host = normalizeSmtpHost(process.env.SMTP_HOST);
  const port = parseEnvPort();
  const from =
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
      auth: authFromEnv(),
      from,
    },
  };
}

/**
 * Prefer Admin Email Settings (DB) for host/port/from/enabled and credentials.
 * Fall back to .env when DB values are empty.
 */
export async function resolveSmtpConfig(): Promise<SmtpResolutionResult> {
  const settings = await prisma.appSettings.findFirst({
    where: { id: 1 },
    select: {
      emailEnabled: true,
      smtpHost: true,
      smtpPort: true,
      senderAddress: true,
      smtpUser: true,
      smtpPasswordEnc: true,
    },
  });

  const dbHost = normalizeSmtpHost(settings?.smtpHost);
  const envHost = normalizeSmtpHost(process.env.SMTP_HOST);
  const host = dbHost || envHost;

  const emailEnabled = dbHost
    ? Boolean(settings?.emailEnabled)
    : isEmailEnabledFromEnv();

  if (!emailEnabled) {
    return { ok: false, reason: "email_disabled" };
  }

  if (!host) {
    return { ok: false, reason: "smtp_not_configured" };
  }

  const port =
    (dbHost ? settings?.smtpPort : null) ??
    parseEnvPort();
  const from =
    (dbHost ? settings?.senderAddress?.trim() : null) ||
    process.env.SMTP_FROM?.trim() ||
    process.env.SENDER_ADDRESS?.trim() ||
    "noreply@dizlee.com";

  const auth = authFromDb(settings ?? null) ?? authFromEnv();

  return {
    ok: true,
    config: {
      host,
      port,
      secure: port === 465,
      auth,
      from,
    },
  };
}

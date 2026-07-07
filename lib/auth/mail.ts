import nodemailer from "nodemailer";

import { buildPasswordEmailContent } from "@/lib/auth/password-email-content";
import type { PasswordResetPurpose } from "@/lib/auth/password-reset";
import { resolveSmtpConfig } from "@/lib/auth/smtp-config";

export type SendPasswordEmailInput = {
  to: string;
  name?: string | null;
  token: string;
  purpose: PasswordResetPurpose;
};

export type SendMailResult = {
  sent: boolean;
  devPreviewUrl?: string;
  reason?: "email_disabled" | "smtp_not_configured";
};

export type SendPlatformEmailInput = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

export function applyEmailRedirect(input: {
  to: string;
  subject: string;
  text: string;
  html: string;
}) {
  const redirectTo = process.env.SMTP_REDIRECT_TO?.trim();
  if (!redirectTo) {
    return input;
  }

  const banner = `[TEST REDIRECT] Original recipient: ${input.to}\n\n`;
  const htmlBanner = `<p style="background:#fef3c7;padding:8px;border-radius:4px;"><strong>[TEST REDIRECT]</strong> Original recipient: ${input.to}</p>`;

  return {
    to: redirectTo,
    subject: `[TEST → ${input.to}] ${input.subject}`,
    text: banner + input.text,
    html: htmlBanner + input.html,
  };
}

export async function sendPlatformEmail(
  input: SendPlatformEmailInput,
): Promise<SendMailResult> {
  const smtpResult = await resolveSmtpConfig();

  if (!smtpResult.ok) {
    if (
      smtpResult.reason === "smtp_not_configured" &&
      process.env.NODE_ENV === "development"
    ) {
      console.info(`[dev] Email to ${input.to}: ${input.subject}`);
      return { sent: false, reason: smtpResult.reason };
    }

    return { sent: false, reason: smtpResult.reason };
  }

  const transporter = nodemailer.createTransport({
    host: smtpResult.config.host,
    port: smtpResult.config.port,
    secure: smtpResult.config.secure,
    auth: smtpResult.config.auth,
  });

  const routed = applyEmailRedirect({
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html,
  });

  await transporter.sendMail({
    from: smtpResult.config.from,
    to: routed.to,
    subject: routed.subject,
    text: routed.text,
    html: routed.html,
  });

  return { sent: true };
}

export async function sendPasswordEmail(
  input: SendPasswordEmailInput,
): Promise<SendMailResult> {
  const content = buildPasswordEmailContent(input);
  const smtpResult = await resolveSmtpConfig();

  if (!smtpResult.ok) {
    if (process.env.NODE_ENV === "development") {
      console.info(
        `[dev] Password email for ${input.to} (${input.purpose}): ${content.link}`,
      );
      return {
        sent: false,
        devPreviewUrl: content.link,
        reason: smtpResult.reason,
      };
    }

    return { sent: false, reason: smtpResult.reason };
  }

  const transporter = nodemailer.createTransport({
    host: smtpResult.config.host,
    port: smtpResult.config.port,
    secure: smtpResult.config.secure,
    auth: smtpResult.config.auth,
  });

  const routed = applyEmailRedirect({
    to: input.to,
    subject: content.subject,
    text: content.text,
    html: content.html,
  });

  await transporter.sendMail({
    from: smtpResult.config.from,
    to: routed.to,
    subject: routed.subject,
    text: routed.text,
    html: routed.html,
  });

  return { sent: true };
}

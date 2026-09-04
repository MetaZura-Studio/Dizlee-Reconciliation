/**
 * Outbound mail transport: password emails and generic platform messages via Nodemailer.
 * Consumed by password flows and platform notification delivery; honors dev preview when SMTP is off.
 */

import nodemailer from "nodemailer";

import { buildPasswordEmailContent } from "@/lib/auth/password-email-content";
import type { PasswordResetPurpose } from "@/lib/auth/password-reset";
import { resolveSmtpConfig, type ResolvedSmtpConfig } from "@/lib/auth/smtp-config";

export type SendPasswordEmailInput = {
  to: string;
  name?: string | null;
  token: string;
  purpose: PasswordResetPurpose;
};

export type SendMailResult = {
  sent: boolean;
  devPreviewUrl?: string;
  reason?: "email_disabled" | "smtp_not_configured" | "smtp_send_failed";
};

export type SendPlatformEmailInput = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

/** Rewrites recipient when SMTP_REDIRECT_TO is set — development/test only. */
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

  // Never redirect real recipients in production (misconfig would leak reset links).
  if (process.env.NODE_ENV === "production") {
    console.warn(
      "[mail] SMTP_REDIRECT_TO is set but ignored in production; emails go to the real recipients.",
    );
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

function formatSmtpSendError(error: unknown): string {
  const message = error instanceof Error ? error.message : "Unknown SMTP error";
  if (message.includes("ENOTFOUND")) {
    return `Cannot reach SMTP server (${message}). Replace smtp.example.com with your real provider host in Admin → Email settings, and set SMTP_USER/SMTP_PASSWORD in .env.`;
  }
  if (message.includes("EAUTH") || message.toLowerCase().includes("authentication")) {
    return "SMTP authentication failed. Set SMTP_USER and SMTP_PASSWORD in your .env file and restart the dev server.";
  }
  return `Failed to send email: ${message}`;
}

async function deliverEmail(
  config: ResolvedSmtpConfig,
  routed: { to: string; subject: string; text: string; html: string },
): Promise<void> {
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.auth,
  });

  try {
    await transporter.sendMail({
      from: config.from,
      to: routed.to,
      subject: routed.subject,
      text: routed.text,
      html: routed.html,
    });
  } catch (error) {
    throw new Error(formatSmtpSendError(error));
  }
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

  const routed = applyEmailRedirect({
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html,
  });

  await deliverEmail(smtpResult.config, routed);
  return { sent: true };
}

export async function sendPasswordEmail(
  input: SendPasswordEmailInput,
): Promise<SendMailResult> {
  const content = await buildPasswordEmailContent(input);
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

  const routed = applyEmailRedirect({
    to: input.to,
    subject: content.subject,
    text: content.text,
    html: content.html,
  });

  try {
    await deliverEmail(smtpResult.config, routed);
    return { sent: true };
  } catch (error) {
    console.error("[mail] Password email send failed:", formatSmtpSendError(error));
    if (process.env.NODE_ENV === "development") {
      console.info(
        `[dev] Password email for ${input.to} (${input.purpose}): ${content.link}`,
      );
      return {
        sent: false,
        devPreviewUrl: content.link,
        reason: "smtp_send_failed",
      };
    }
    return { sent: false, reason: "smtp_send_failed" };
  }
}

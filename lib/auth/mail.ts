import nodemailer from "nodemailer";

import { buildPasswordEmailContent } from "@/lib/auth/password-email-content";
import type { PasswordResetPurpose } from "@/lib/auth/password-reset";

export type SendPasswordEmailInput = {
  to: string;
  name?: string | null;
  token: string;
  purpose: PasswordResetPurpose;
};

export type SendPasswordEmailResult = {
  sent: boolean;
  devPreviewUrl?: string;
  reason?: string;
};

function getSmtpConfig() {
  const host = process.env.SMTP_HOST?.trim();
  const port = Number(process.env.SMTP_PORT ?? "587");
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASSWORD;
  const from =
    process.env.SMTP_FROM?.trim() ??
    process.env.SENDER_ADDRESS?.trim() ??
    "noreply@dizlee.com";

  if (!host) {
    return null;
  }

  return {
    host,
    port,
    secure: port === 465,
    auth: user && pass ? { user, pass } : undefined,
    from,
  };
}

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

export async function sendPasswordEmail(
  input: SendPasswordEmailInput,
): Promise<SendPasswordEmailResult> {
  const content = buildPasswordEmailContent(input);
  const smtp = getSmtpConfig();

  if (!smtp) {
    if (process.env.NODE_ENV === "development") {
      console.info(
        `[dev] Password email for ${input.to} (${input.purpose}): ${content.link}`,
      );
      return { sent: false, devPreviewUrl: content.link, reason: "smtp_not_configured" };
    }

    return { sent: false, reason: "smtp_not_configured" };
  }

  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: smtp.auth,
  });

  const routed = applyEmailRedirect({
    to: input.to,
    subject: content.subject,
    text: content.text,
    html: content.html,
  });

  await transporter.sendMail({
    from: smtp.from,
    to: routed.to,
    subject: routed.subject,
    text: routed.text,
    html: routed.html,
  });

  return { sent: true };
}

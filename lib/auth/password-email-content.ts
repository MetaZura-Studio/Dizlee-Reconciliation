import {
  buildPasswordActionUrl,
  formatTokenExpiryHours,
  type PasswordResetPurpose,
} from "@/lib/auth/password-reset";
import { getActiveEmailTemplate } from "@/lib/platform/email-templates";
import { applyTemplate } from "@/lib/platform/template-placeholders";

export type PasswordEmailContentInput = {
  name?: string | null;
  token: string;
  purpose: PasswordResetPurpose;
};

export type PasswordEmailContent = {
  subject: string;
  text: string;
  html: string;
  link: string;
};

function passwordTemplateCode(purpose: PasswordResetPurpose): string {
  return purpose === "invite" ? "PASSWORD_INVITE" : "PASSWORD_FORGOT";
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function textBodyToHtmlParagraphs(text: string): string {
  const blocks = text
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  return blocks
    .map((block) => {
      const withBreaks = escapeHtml(block).replaceAll("\n", "<br>");
      return `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#3f3f46;">${withBreaks}</p>`;
    })
    .join("");
}

function wrapPasswordEmailHtml(params: {
  subject: string;
  title: string;
  bodyHtml: string;
  link: string;
  ctaLabel: string;
}): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(params.subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:8px;border:1px solid #e4e4e7;">
          <tr>
            <td style="padding:32px 32px 24px;">
              <p style="margin:0 0 8px;font-size:12px;font-weight:600;color:#71717a;text-transform:uppercase;letter-spacing:0.05em;">Dizlee Reconciliation</p>
              <h1 style="margin:0 0 16px;font-size:22px;font-weight:600;line-height:1.3;color:#18181b;">${escapeHtml(params.title)}</h1>
              ${params.bodyHtml}
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-radius:6px;background:#18181b;">
                    <a href="${escapeHtml(params.link)}" target="_blank" style="display:inline-block;padding:12px 24px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">${escapeHtml(params.ctaLabel)}</a>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 8px;font-size:13px;line-height:1.6;color:#71717a;">Or copy and paste this link into your browser:</p>
              <p style="margin:0;font-size:13px;line-height:1.6;color:#52525b;word-break:break-all;">${escapeHtml(params.link)}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 24px;border-top:1px solid #f4f4f5;">
              <p style="margin:0;font-size:12px;color:#a1a1aa;">— Dizlee Reconciliation</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Hardcoded fallback when DB templates are missing. */
export function buildPasswordEmailContentFallback(
  input: PasswordEmailContentInput,
): PasswordEmailContent {
  const link = buildPasswordActionUrl(input.token, input.purpose);
  const expiryHours = formatTokenExpiryHours(input.purpose);
  const greeting = input.name?.trim() ? `Hi ${input.name.trim()},` : "Hi,";

  const isInvite = input.purpose === "invite";

  const subject = isInvite
    ? "Set your Dizlee Reconciliation password"
    : "Reset your Dizlee Reconciliation password";

  const title = isInvite
    ? "Welcome to Dizlee Reconciliation"
    : "Reset your password";

  const intro = isInvite
    ? "An administrator created your account. Click the button below to choose a password and sign in."
    : "We received a request to reset your password. Click the button below to choose a new one.";

  const ctaLabel = isInvite ? "Set your password" : "Reset your password";

  const text = `${greeting}

${intro}

${link}

This link expires in ${expiryHours} hour(s) and can only be used once.

If you did not expect this email, you can ignore it.

— Dizlee Reconciliation`;

  const html = wrapPasswordEmailHtml({
    subject,
    title,
    bodyHtml: textBodyToHtmlParagraphs(`${greeting}\n\n${intro}`),
    link,
    ctaLabel,
  });

  return { subject, text, html, link };
}

/**
 * Prefer live Admin templates (PASSWORD_INVITE / PASSWORD_FORGOT).
 * Falls back to hardcoded content if the template is missing.
 */
export async function buildPasswordEmailContent(
  input: PasswordEmailContentInput,
): Promise<PasswordEmailContent> {
  const link = buildPasswordActionUrl(input.token, input.purpose);
  const expiryHours = String(formatTokenExpiryHours(input.purpose));
  const displayName = input.name?.trim() || "there";
  const code = passwordTemplateCode(input.purpose);
  const template = await getActiveEmailTemplate(code);

  if (!template) {
    return buildPasswordEmailContentFallback(input);
  }

  const values = {
    name: displayName,
    link,
    expiryHours,
  };

  const subject = applyTemplate(template.subject, values).slice(0, 255);
  const text = applyTemplate(template.body, values);
  const isInvite = input.purpose === "invite";
  const title = isInvite
    ? "Welcome to Dizlee Reconciliation"
    : "Reset your password";
  const ctaLabel = isInvite ? "Set your password" : "Reset your password";

  const html = wrapPasswordEmailHtml({
    subject,
    title,
    bodyHtml: textBodyToHtmlParagraphs(text),
    link,
    ctaLabel,
  });

  return { subject, text, html, link };
}

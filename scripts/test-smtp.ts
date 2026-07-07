/**
 * Quick SMTP test — run: node --env-file=.env --import tsx scripts/test-smtp.ts your@email.com
 */
import nodemailer from "nodemailer";

import { applyEmailRedirect } from "../lib/auth/mail";

const to = process.argv[2];
if (!to) {
  console.error("Usage: npx tsx scripts/test-smtp.ts recipient@example.com");
  process.exit(1);
}

const host = process.env.SMTP_HOST;
const port = Number(process.env.SMTP_PORT ?? "465");
const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASSWORD;
const from = process.env.SMTP_FROM ?? user;

if (!host || !user || !pass) {
  console.error("Missing SMTP_HOST, SMTP_USER, or SMTP_PASSWORD in .env");
  process.exit(1);
}

const transporter = nodemailer.createTransport({
  host,
  port,
  secure: port === 465,
  auth: { user, pass },
});

async function main() {
  const routed = applyEmailRedirect({
    to,
    subject: "Dizlee SMTP test",
    text: "If you received this, Titan SMTP + nodemailer is working.",
    html: "<p>If you received this, Titan SMTP + nodemailer is working.</p>",
  });

  const info = await transporter.sendMail({
    from,
    to: routed.to,
    subject: routed.subject,
    text: routed.text,
    html: routed.html,
  });
  console.log("Email sent:", info.messageId, "→", routed.to);
}

main().catch((error) => {
  console.error("SMTP test failed:", error);
  process.exit(1);
});

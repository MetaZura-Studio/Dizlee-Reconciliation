/**
 * Encrypt / decrypt SMTP password for app_settings.smtp_password_enc.
 * Uses AES-256-GCM keyed from NEXTAUTH_SECRET (or SMTP_CREDENTIALS_SECRET).
 */

import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from "crypto";

const PREFIX = "v1";
const SALT = "dizlee-smtp-credentials-v1";

function resolveSecretKey(): Buffer {
  const secret =
    process.env.SMTP_CREDENTIALS_SECRET?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim();
  if (!secret) {
    throw new Error(
      "NEXTAUTH_SECRET (or SMTP_CREDENTIALS_SECRET) is required to store SMTP passwords.",
    );
  }
  return scryptSync(secret, SALT, 32);
}

export function encryptSmtpPassword(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", resolveSecretKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(plain, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [
    PREFIX,
    iv.toString("base64url"),
    tag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(":");
}

export function decryptSmtpPassword(payload: string): string {
  const parts = payload.split(":");
  if (parts.length !== 4 || parts[0] !== PREFIX) {
    throw new Error("Invalid SMTP password ciphertext.");
  }
  const [, ivB64, tagB64, dataB64] = parts;
  const iv = Buffer.from(ivB64, "base64url");
  const tag = Buffer.from(tagB64, "base64url");
  const data = Buffer.from(dataB64, "base64url");
  const decipher = createDecipheriv("aes-256-gcm", resolveSecretKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString(
    "utf8",
  );
}

export function tryDecryptSmtpPassword(
  payload: string | null | undefined,
): string | null {
  if (!payload?.trim()) {
    return null;
  }
  try {
    return decryptSmtpPassword(payload);
  } catch {
    return null;
  }
}

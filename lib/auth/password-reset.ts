/**
 * Password reset token lifecycle, TTL policy, and action URL construction.
 * Consumed by invite and forgot-password flows; tokens are stored hashed (SHA-256).
 */

import { createHash, randomBytes } from "crypto";

/** Admin invite link — 1 hour */
export const INVITE_TOKEN_TTL_MS = 60 * 60 * 1000;

/** Self-service forgot password — 1 hour */
export const FORGOT_PASSWORD_TOKEN_TTL_MS = 60 * 60 * 1000;

export type PasswordResetPurpose = "invite" | "forgot";

export function getPasswordResetTtlMs(purpose: PasswordResetPurpose): number {
  return purpose === "invite"
    ? INVITE_TOKEN_TTL_MS
    : FORGOT_PASSWORD_TOKEN_TTL_MS;
}

export function generatePasswordResetToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashPasswordResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function buildPasswordActionUrl(
  token: string,
  purpose: PasswordResetPurpose,
): string {
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const path = purpose === "forgot" ? "reset-password" : "set-password";
  return `${baseUrl.replace(/\/$/, "")}/${path}?token=${encodeURIComponent(token)}`;
}

/** @deprecated Use buildPasswordActionUrl(token, "invite") */
export function buildSetPasswordUrl(token: string): string {
  return buildPasswordActionUrl(token, "invite");
}

export function formatTokenExpiryHours(purpose: PasswordResetPurpose): string {
  const hours = getPasswordResetTtlMs(purpose) / (60 * 60 * 1000);
  return Number.isInteger(hours) ? String(hours) : hours.toFixed(1);
}

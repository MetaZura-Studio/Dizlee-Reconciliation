import { describe, expect, it } from "vitest";

import {
  FORGOT_PASSWORD_TOKEN_TTL_MS,
  generatePasswordResetToken,
  getPasswordResetTtlMs,
  hashPasswordResetToken,
  INVITE_TOKEN_TTL_MS,
} from "@/lib/auth/password-reset";

describe("password reset tokens", () => {
  it("uses 1 hour for admin invite links", () => {
    expect(getPasswordResetTtlMs("invite")).toBe(INVITE_TOKEN_TTL_MS);
    expect(INVITE_TOKEN_TTL_MS).toBe(60 * 60 * 1000);
  });

  it("uses 24 hours for forgot-password links", () => {
    expect(getPasswordResetTtlMs("forgot")).toBe(FORGOT_PASSWORD_TOKEN_TTL_MS);
    expect(FORGOT_PASSWORD_TOKEN_TTL_MS).toBe(24 * 60 * 60 * 1000);
  });

  it("hashes tokens consistently", () => {
    const token = generatePasswordResetToken();
    expect(token.length).toBeGreaterThan(20);
    expect(hashPasswordResetToken(token)).toBe(hashPasswordResetToken(token));
  });
});

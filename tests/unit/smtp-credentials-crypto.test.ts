import { afterEach, describe, expect, it } from "vitest";

import {
  decryptSmtpPassword,
  encryptSmtpPassword,
  tryDecryptSmtpPassword,
} from "@/lib/platform/smtp-credentials-crypto";

describe("smtp credentials crypto", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("round-trips a password with NEXTAUTH_SECRET", () => {
    process.env.NEXTAUTH_SECRET = "unit-test-nextauth-secret-value";
    const cipher = encryptSmtpPassword("s3cret!");
    expect(cipher.startsWith("v1:")).toBe(true);
    expect(decryptSmtpPassword(cipher)).toBe("s3cret!");
  });

  it("returns null for invalid ciphertext via tryDecrypt", () => {
    process.env.NEXTAUTH_SECRET = "unit-test-nextauth-secret-value";
    expect(tryDecryptSmtpPassword("not-valid")).toBeNull();
    expect(tryDecryptSmtpPassword(null)).toBeNull();
  });
});

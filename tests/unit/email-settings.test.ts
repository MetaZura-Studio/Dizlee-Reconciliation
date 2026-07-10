import { afterEach, describe, expect, it } from "vitest";

import { sendTestEmailSchema } from "@/lib/admin/validation/email-settings";
import {
  getEmailSettingsFromEnv,
  isEmailEnabledFromEnv,
  resolveSmtpConfigFromEnv,
} from "@/lib/auth/smtp-config";

describe("email settings validation", () => {
  it("accepts a valid test recipient email", () => {
    const result = sendTestEmailSchema.safeParse({
      recipient: "you@example.com",
    });

    expect(result.success).toBe(true);
  });
});

describe("resolveSmtpConfigFromEnv", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("returns email_disabled when EMAIL_ENABLED is false", () => {
    process.env.EMAIL_ENABLED = "false";
    process.env.SMTP_HOST = "smtp.titan.email";

    expect(resolveSmtpConfigFromEnv()).toEqual({
      ok: false,
      reason: "email_disabled",
    });
  });

  it("uses SMTP values from the environment when enabled", () => {
    process.env.EMAIL_ENABLED = "true";
    process.env.SMTP_HOST = "smtp.titan.email";
    process.env.SMTP_PORT = "465";
    process.env.SMTP_FROM = "noreply@dizlee.com";
    process.env.SMTP_USER = "user@example.com";
    process.env.SMTP_PASSWORD = "secret";

    const result = resolveSmtpConfigFromEnv();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.config.host).toBe("smtp.titan.email");
      expect(result.config.port).toBe(465);
      expect(result.config.secure).toBe(true);
      expect(result.config.from).toBe("noreply@dizlee.com");
      expect(result.config.auth).toEqual({
        user: "user@example.com",
        pass: "secret",
      });
    }
  });

  it("returns smtp_not_configured when SMTP_HOST is missing", () => {
    delete process.env.SMTP_HOST;
    process.env.EMAIL_ENABLED = "true";

    expect(resolveSmtpConfigFromEnv()).toEqual({
      ok: false,
      reason: "smtp_not_configured",
    });
  });

  it("ignores the placeholder SMTP host", () => {
    process.env.SMTP_HOST = "smtp.example.com";
    process.env.EMAIL_ENABLED = "true";

    expect(resolveSmtpConfigFromEnv()).toEqual({
      ok: false,
      reason: "smtp_not_configured",
    });
  });

  it("exposes env values for the admin read-only view", () => {
    process.env.EMAIL_ENABLED = "true";
    process.env.SMTP_HOST = "smtp.titan.email";
    process.env.SMTP_PORT = "587";
    process.env.SMTP_FROM = "env@dizlee.com";

    expect(getEmailSettingsFromEnv()).toEqual({
      emailEnabled: true,
      senderAddress: "env@dizlee.com",
      smtpHost: "smtp.titan.email",
      smtpPort: 587,
    });
    expect(isEmailEnabledFromEnv()).toBe(true);
  });
});

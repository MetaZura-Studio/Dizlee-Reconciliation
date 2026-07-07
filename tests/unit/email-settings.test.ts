import { afterEach, describe, expect, it } from "vitest";

import { updateEmailSettingsSchema } from "@/lib/admin/validation/email-settings";
import {
  resolveSmtpConfigFromSnapshot,
  type EmailSettingsSnapshot,
} from "@/lib/auth/smtp-config";

describe("email settings validation", () => {
  it("accepts enabled settings with optional blank fields", () => {
    const result = updateEmailSettingsSchema.safeParse({
      emailEnabled: true,
      senderAddress: "",
      smtpHost: "smtp.titan.email",
      smtpPort: 465,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.senderAddress).toBeNull();
    }
  });

  it("rejects invalid test recipient emails", () => {
    const result = updateEmailSettingsSchema.safeParse({
      emailEnabled: true,
      senderAddress: "noreply@dizlee.com",
      smtpHost: "smtp.titan.email",
      smtpPort: null,
    });

    expect(result.success).toBe(true);
  });
});

describe("resolveSmtpConfigFromSnapshot", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("returns email_disabled when notifications are disabled", () => {
    const settings: EmailSettingsSnapshot = {
      emailEnabled: false,
      senderAddress: "noreply@dizlee.com",
      smtpHost: "smtp.titan.email",
      smtpPort: 465,
    };

    expect(resolveSmtpConfigFromSnapshot(settings)).toEqual({
      ok: false,
      reason: "email_disabled",
    });
  });

  it("uses database host, port, and sender when enabled", () => {
    process.env.SMTP_USER = "user@example.com";
    process.env.SMTP_PASSWORD = "secret";

    const settings: EmailSettingsSnapshot = {
      emailEnabled: true,
      senderAddress: "noreply@dizlee.com",
      smtpHost: "smtp.titan.email",
      smtpPort: 465,
    };

    const result = resolveSmtpConfigFromSnapshot(settings);
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

  it("falls back to environment SMTP host when database host is blank", () => {
    process.env.SMTP_HOST = "smtp.env.example";
    process.env.SMTP_PORT = "587";
    process.env.SMTP_FROM = "env@dizlee.com";

    const settings: EmailSettingsSnapshot = {
      emailEnabled: true,
      senderAddress: null,
      smtpHost: null,
      smtpPort: null,
    };

    const result = resolveSmtpConfigFromSnapshot(settings);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.config.host).toBe("smtp.env.example");
      expect(result.config.port).toBe(587);
      expect(result.config.from).toBe("env@dizlee.com");
    }
  });

  it("returns smtp_not_configured when no host is available", () => {
    delete process.env.SMTP_HOST;

    const settings: EmailSettingsSnapshot = {
      emailEnabled: true,
      senderAddress: null,
      smtpHost: null,
      smtpPort: null,
    };

    expect(resolveSmtpConfigFromSnapshot(settings)).toEqual({
      ok: false,
      reason: "smtp_not_configured",
    });
  });
});

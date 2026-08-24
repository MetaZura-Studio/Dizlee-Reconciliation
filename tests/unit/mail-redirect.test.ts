import { afterEach, describe, expect, it, vi } from "vitest";

import { applyEmailRedirect } from "@/lib/auth/mail";

describe("applyEmailRedirect", () => {
  const originalRedirect = process.env.SMTP_REDIRECT_TO;

  afterEach(() => {
    if (originalRedirect === undefined) {
      delete process.env.SMTP_REDIRECT_TO;
    } else {
      process.env.SMTP_REDIRECT_TO = originalRedirect;
    }
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("passes through when SMTP_REDIRECT_TO is unset", () => {
    delete process.env.SMTP_REDIRECT_TO;
    vi.stubEnv("NODE_ENV", "development");

    const input = {
      to: "user@example.com",
      subject: "Hello",
      text: "Body",
      html: "<p>Body</p>",
    };

    expect(applyEmailRedirect(input)).toEqual(input);
  });

  it("reroutes to test inbox in non-production", () => {
    vi.stubEnv("NODE_ENV", "development");
    process.env.SMTP_REDIRECT_TO = "test@gmail.com";

    const result = applyEmailRedirect({
      to: "user@example.com",
      subject: "Set password",
      text: "Click here",
      html: "<p>Click here</p>",
    });

    expect(result.to).toBe("test@gmail.com");
    expect(result.subject).toBe("[TEST → user@example.com] Set password");
    expect(result.text).toContain("Original recipient: user@example.com");
    expect(result.html).toContain("Original recipient: user@example.com");
  });

  it("ignores SMTP_REDIRECT_TO in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    process.env.SMTP_REDIRECT_TO = "test@gmail.com";
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const input = {
      to: "user@example.com",
      subject: "Set password",
      text: "Click here",
      html: "<p>Click here</p>",
    };

    expect(applyEmailRedirect(input)).toEqual(input);
    expect(warn).toHaveBeenCalled();
  });
});

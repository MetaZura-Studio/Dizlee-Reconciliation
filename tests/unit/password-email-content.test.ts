import { beforeEach, describe, expect, it, vi } from "vitest";

const mockedGetActiveEmailTemplate = vi.fn();

vi.mock("@/lib/platform/email-templates", () => ({
  getActiveEmailTemplate: (...args: unknown[]) =>
    mockedGetActiveEmailTemplate(...args),
}));

import {
  buildPasswordEmailContent,
  buildPasswordEmailContentFallback,
} from "@/lib/auth/password-email-content";
import { buildPasswordActionUrl } from "@/lib/auth/password-reset";

describe("password email content", () => {
  beforeEach(() => {
    mockedGetActiveEmailTemplate.mockReset();
  });

  it("uses reset-password path for forgot flow fallback", () => {
    const content = buildPasswordEmailContentFallback({
      token: "abc123",
      purpose: "forgot",
      name: "Jane",
    });

    expect(content.link).toContain("/reset-password?token=");
    expect(content.subject).toContain("Reset");
    expect(content.html).toContain("Reset your password");
    expect(content.text).toContain("reset your password");
  });

  it("uses set-password path for invite flow fallback", () => {
    const content = buildPasswordEmailContentFallback({
      token: "abc123",
      purpose: "invite",
    });

    expect(content.link).toContain("/set-password?token=");
    expect(content.subject).toContain("Set your");
    expect(content.html).toContain("Set your password");
  });

  it("buildPasswordActionUrl routes by purpose", () => {
    expect(buildPasswordActionUrl("tok", "forgot")).toContain("/reset-password?");
    expect(buildPasswordActionUrl("tok", "invite")).toContain("/set-password?");
  });

  it("falls back when DB template is missing", async () => {
    mockedGetActiveEmailTemplate.mockResolvedValue(null);

    const content = await buildPasswordEmailContent({
      token: "abc123",
      purpose: "invite",
      name: "Alex",
    });

    expect(mockedGetActiveEmailTemplate).toHaveBeenCalledWith("PASSWORD_INVITE");
    expect(content.subject).toContain("Set your");
    expect(content.text).toContain("Alex");
  });

  it("substitutes placeholders from DB template", async () => {
    mockedGetActiveEmailTemplate.mockResolvedValue({
      code: "PASSWORD_FORGOT",
      subject: "Reset for {{name}}",
      body: "Link: {{link}}\nExpires in {{expiryHours}}h",
    });

    const content = await buildPasswordEmailContent({
      token: "tok99",
      purpose: "forgot",
      name: "Sam",
    });

    expect(content.subject).toBe("Reset for Sam");
    expect(content.text).toContain("Link:");
    expect(content.text).toContain("/reset-password?token=");
    expect(content.text).toContain("Expires in");
    expect(content.html).toContain("Reset for Sam");
  });
});

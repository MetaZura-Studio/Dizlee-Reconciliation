import { describe, expect, it } from "vitest";

import { buildPasswordEmailContent } from "@/lib/auth/password-email-content";
import { buildPasswordActionUrl } from "@/lib/auth/password-reset";

describe("password email content", () => {
  it("uses reset-password path for forgot flow", () => {
    const content = buildPasswordEmailContent({
      token: "abc123",
      purpose: "forgot",
      name: "Jane",
    });

    expect(content.link).toContain("/reset-password?token=");
    expect(content.subject).toContain("Reset");
    expect(content.html).toContain("Reset your password");
    expect(content.text).toContain("reset your password");
  });

  it("uses set-password path for invite flow", () => {
    const content = buildPasswordEmailContent({
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
});
